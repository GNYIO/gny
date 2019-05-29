import * as assert from 'assert';
import * as crypto from 'crypto';
import async = require('async');
import { maxPayloadLength, maxTxsPerBlock } from '../utils/constants';
import slots from '../utils/slots';
import addressHelper = require('../utils/address');
import Blockreward from '../utils/block-reward';
import {
  Modules,
  IScope,
  KeyPair,
  IGenesisBlock,
  ISimpleCache,
  PeerNode,
  ProcessBlockOptions,
  BlockPropose,
  Next,
  IBlock,
  ManyVotes,
  Transaction,
  FirstHeightIds,
  CommonBlockParams,
  CommonBlockResult,
} from '../interfaces';
import pWhilst from 'p-whilst';
import { BlockBase } from '../base/block';
import { TransactionBase } from '../base/transaction';
import { ConsensusBase } from '../base/consensus';
import { RoundBase } from '../base/round';

export default class Blocks {
  private genesisBlock: IGenesisBlock;
  private modules: Modules;
  private readonly library: IScope;

  private lastBlock: IBlock;
  private loaded: boolean = false;
  private blockCache: ISimpleCache = {};
  private proposeCache: ISimpleCache = {};
  private lastPropose: BlockPropose = null;
  private privIsCollectingVotes = false;

  private lastVoteTime: number;
  private blockreward = new Blockreward();

  constructor(scope: IScope) {
    this.library = scope;
    this.genesisBlock = scope.genesisBlock;
  }

  // priv methods

  private async getIdSequence2(height: number) {
    try {
      const maxHeight = Math.max(height, this.lastBlock.height);
      const minHeight = Math.max(0, maxHeight - 4);
      let blocks = await global.app.sdb.getBlocksByHeightRange(
        minHeight,
        maxHeight
      );
      blocks = blocks.reverse();
      const ids = blocks.map(b => b.id);
      return { ids, firstHeight: minHeight } as FirstHeightIds;
    } catch (e) {
      throw e;
    }
  }

  // todo look at core/loader
  public getCommonBlock = async (
    peer: PeerNode,
    lastBlockHeight: number
  ): Promise<IBlock> => {
    let data: FirstHeightIds;
    try {
      data = await this.getIdSequence2(lastBlockHeight);
    } catch (e) {
      this.library.logger.error(
        `Failed to get this.last block id sequence${e}`
      );
      throw e;
    }

    this.library.logger.trace('getIdSequence=========', data);
    const params: CommonBlockParams = {
      max: lastBlockHeight,
      min: data.firstHeight,
      ids: data.ids,
    };

    let ret: CommonBlockResult;
    try {
      ret = await this.modules.peer.request('commonBlock', params, peer);
    } catch (err) {
      return err.toString();
    }

    if (!ret.common) {
      throw new Error('Common block not found');
    }

    return ret.common;
  };

  public setLastBlock = (block: IBlock | Pick<IBlock, 'height'>) => {
    if (typeof block.height === 'string') {
      block.height = Number(block.height);
    }
    this.lastBlock = block;
  };

  public getLastBlock = () => this.lastBlock;

  public verifyBlock = async (
    block: IBlock,
    options: Pick<ProcessBlockOptions, 'votes'>
  ) => {
    try {
      block.id = BlockBase.getId(block);
    } catch (e) {
      throw new Error(`Failed to get block id: ${e.toString()}`);
    }

    this.library.logger.debug(
      `verifyBlock, id: ${block.id}, h: ${block.height}`
    );

    if (!block.prevBlockId && block.height !== 0) {
      throw new Error('Previous block should not be null');
    }

    try {
      if (!BlockBase.verifySignature(block)) {
        throw new Error('Failed to verify block signature');
      }
    } catch (e) {
      this.library.logger.error({ e, block });
      throw new Error(
        `Got exception while verify block signature: ${e.toString()}`
      );
    }

    if (block.prevBlockId !== this.lastBlock.id) {
      throw new Error('Incorrect previous block hash');
    }

    if (block.height !== 0) {
      const blockSlotNumber = slots.getSlotNumber(block.timestamp);
      const lastBlockSlotNumber = slots.getSlotNumber(this.lastBlock.timestamp);

      if (
        blockSlotNumber > slots.getSlotNumber() + 1 ||
        blockSlotNumber <= lastBlockSlotNumber
      ) {
        throw new Error(`Can't verify block timestamp: ${block.id}`);
      }
    }

    if (block.transactions.length > maxTxsPerBlock) {
      throw new Error(`Invalid amount of block assets: ${block.id}`);
    }
    if (block.transactions.length !== block.count) {
      throw new Error('Invalid transaction count');
    }

    const payloadHash = crypto.createHash('sha256');
    const appliedTransactions: any = {};

    let totalFee = 0;
    for (const transaction of block.transactions) {
      totalFee += transaction.fee;

      let bytes;
      try {
        bytes = TransactionBase.getBytes(transaction);
      } catch (e) {
        throw new Error(`Failed to get transaction bytes: ${e.toString()}`);
      }

      if (appliedTransactions[transaction.id]) {
        throw new Error(`Duplicate transaction id in block ${block.id}`);
      }

      appliedTransactions[transaction.id] = transaction;
      payloadHash.update(bytes);
    }

    if (Number(totalFee) !== Number(block.fees)) {
      throw new Error('Invalid total fees');
    }

    const expectedReward = this.blockreward.calculateReward(block.height);
    if (expectedReward !== Number(block.reward)) {
      throw new Error('Invalid block reward');
    }

    if (options.votes) {
      const votes = options.votes;
      if (block.height !== votes.height) {
        throw new Error('Votes height is not correct');
      }
      if (block.id !== votes.id) {
        throw new Error('Votes id is not correct');
      }
      if (!votes.signatures || !ConsensusBase.hasEnoughVotesRemote(votes)) {
        throw new Error('Votes signature is not correct');
      }
      await this.verifyBlockVotes(block, votes);
    }
  };

  public verifyBlockVotes = async (block: IBlock, votes: ManyVotes) => {
    // is this working??
    const delegateList = await this.modules.delegates.generateDelegateList(
      block.height
    );
    const publicKeySet = new Set(delegateList);
    for (const item of votes.signatures) {
      if (!publicKeySet.has(item.publicKey)) {
        throw new Error(`Votes key is not in the top list: ${item.publicKey}`);
      }
      if (!ConsensusBase.verifyVote(votes.height, votes.id, item)) {
        throw new Error('Failed to verify vote signature');
      }
    }
  };

  public applyBlock = async (block: IBlock) => {
    this.library.logger.trace('enter applyblock');
    const appliedTransactions: any = {};

    try {
      for (const transaction of block.transactions) {
        if (appliedTransactions[transaction.id]) {
          throw new Error(`Duplicate transaction in block: ${transaction.id}`);
        }
        await this.modules.transactions.applyUnconfirmedTransactionAsync(
          transaction
        );
        // TODO not just remove, should mark as applied
        // modules.blockchain.transactions.removeUnconfirmedTransaction(transaction.id)
        appliedTransactions[transaction.id] = transaction;
      }
    } catch (e) {
      this.library.logger.error(e);
      await global.app.sdb.rollbackBlock();
      throw new Error(`Failed to apply block: ${e}`);
    }
  };

  private processBlock = async (
    b: IGenesisBlock | any,
    options: ProcessBlockOptions
  ) => {
    if (!this.loaded) throw new Error('Blockchain is loading');

    this.library.logger.info(`processBlock, options: ${Object.keys(options)}`);

    let block = b;
    await global.app.sdb.beginBlock(block);

    try {
      if (!block.transactions) block.transactions = [];
      if (!options.local) {
        try {
          block = BlockBase.normalizeBlock(block);
        } catch (e) {
          this.library.logger.error(`Failed to normalize block: ${e}`, block);
          throw e;
        }

        // TODO sort transactions
        // block.transactions = library.base.block.sortTransactions(block)
        await this.verifyBlock(block, options);

        this.library.logger.debug('verify block ok');
        if (block.height !== 0) {
          const exists = await global.app.sdb.exists('Block', { id: block.id });
          if (exists) throw new Error(`Block already exists: ${block.id}`);
        }

        if (block.height !== 0) {
          try {
            await this.modules.delegates.validateBlockSlot(block);
          } catch (e) {
            this.library.logger.error(e);
            throw new Error(`Can't verify slot: ${e}`);
          }
          this.library.logger.debug('verify block slot ok');
        }

        // TODO use bloomfilter
        for (let i = 0; i < block.transactions.length; ++i) {
          block.transactions[i] = TransactionBase.normalizeTransaction(
            block.transactions[i]
          );
        }
        const idList = block.transactions.map(t => t.id);

        if (
          idList.length !== 0 &&
          (await global.app.sdb.exists('Transaction', { id: idList }))
        ) {
          throw new Error('Block contain already confirmed transaction');
        }

        this.library.logger.trace('before applyBlock');
        try {
          await this.applyBlock(block);
        } catch (e) {
          this.library.logger.error(`Failed to apply block: ${e}`);
          throw e;
        }
      }
    } catch (e) {
      await global.app.sdb.rollbackBlock();
      throw e;
    }

    try {
      await this.saveBlockTransactions(block);
      await this.applyRound(block);
      await global.app.sdb.commitBlock();
      const trsCount = block.transactions.length;
      this.library.logger.info(
        `Block applied correctly with ${trsCount} transactions`
      );
      this.setLastBlock(block);

      if (options.broadcast && options.local) {
        options.votes.signatures = options.votes.signatures.slice(0, 6);
        this.library.bus.message('onNewBlock', block, options.votes);
      }
      this.library.bus.message('onProcessBlock', block);
    } catch (e) {
      this.library.logger.error(block);
      this.library.logger.error('save block error: ', e);
      await global.app.sdb.rollbackBlock();
      throw new Error(`Failed to save block: ${e}`);
    } finally {
      this.blockCache = {};
      this.proposeCache = {};
      this.lastVoteTime = null;
      this.privIsCollectingVotes = false;
      this.library.modules.consensusManagement.clearState();
    }
  };

  public saveBlockTransactions = async (block: IBlock) => {
    this.library.logger.trace(
      'Blocks#saveBlockTransactions height',
      block.height
    );
    for (const trs of block.transactions) {
      trs.height = block.height;
      // trs.block = block;
      trs.signatures = JSON.stringify(trs.signatures);
      trs.args = JSON.stringify(trs.args);
      await global.app.sdb.create('Transaction', trs);
    }
    this.library.logger.trace('Blocks#save transactions');
  };

  public increaseRoundData = async (modifier, roundNumber): Promise<any> => {
    await global.app.sdb.createOrLoad('Round', {
      fee: 0,
      reward: 0,
      round: roundNumber,
    });
    await global.app.sdb.increase('Round', modifier, { round: roundNumber });
    return await global.app.sdb.load('Round', { round: roundNumber });
  };

  public applyRound = async (block: IBlock) => {
    if (block.height === 0) {
      await this.modules.delegates.updateBookkeeper();
      return;
    }

    let address = addressHelper.generateAddress(block.delegate);
    await global.app.sdb.increase(
      'Delegate',
      { producedBlocks: 1 },
      { address }
    );

    let transFee = 0;
    for (const t of block.transactions) {
      if (t.fee >= 0) {
        transFee += t.fee;
      }
    }

    const roundNumber = RoundBase.calculateRound(block.height);
    const { fee, reward } = await this.increaseRoundData(
      { fee: transFee, reward: block.reward },
      roundNumber
    );

    if (block.height % 101 !== 0) return;

    this.library.logger.debug(
      `----------------------on round ${roundNumber} end-----------------------`
    );

    const delegates = await this.modules.delegates.generateDelegateList(
      block.height
    );
    if (!delegates) {
      throw new Error('no delegates');
    }
    this.library.logger.debug('delegate length', delegates.length);

    const forgedBlocks = await global.app.sdb.getBlocksByHeightRange(
      block.height - 100,
      block.height - 1
    );
    const forgedDelegates = [
      ...forgedBlocks.map(b => b.delegate),
      block.delegate,
    ];

    const missedDelegates = delegates.filter(
      fd => !forgedDelegates.includes(fd)
    );
    missedDelegates.forEach(async md => {
      address = addressHelper.generateAddress(md);
      await global.app.sdb.increase(
        'Delegate',
        { missedBlocks: 1 },
        { address }
      );
    });

    async function updateDelegate(pk, fee, reward) {
      address = addressHelper.generateAddress(pk);
      await global.app.sdb.increase(
        'Delegate',
        { fees: fee, rewards: reward },
        { address }
      );
      // TODO should account be all cached?
      await global.app.sdb.increase(
        'Account',
        { gny: fee + reward },
        { address }
      );
    }

    const ratio = 1;

    const actualFees = Math.floor(fee * ratio);
    const feeAverage = Math.floor(actualFees / delegates.length);
    const feeRemainder = actualFees - feeAverage * delegates.length;
    // let feeFounds = fees - actualFees

    const actualRewards = Math.floor(reward * ratio);
    const rewardAverage = Math.floor(actualRewards / delegates.length);
    const rewardRemainder = actualRewards - rewardAverage * delegates.length;
    // let rewardFounds = rewards - actualRewards

    for (const fd of forgedDelegates) {
      await updateDelegate(fd, feeAverage, rewardAverage);
    }
    await updateDelegate(block.delegate, feeRemainder, rewardRemainder);

    if (block.height % 101 === 0) {
      await this.modules.delegates.updateBookkeeper();
    }
  };

  public getBlocks = async (
    minHeight: number,
    maxHeight: number,
    withTransaction: boolean
  ) => {
    const blocks: any = await global.app.sdb.getBlocksByHeightRange(
      minHeight,
      maxHeight
    );

    if (!blocks || !blocks.length) {
      return [];
    }

    maxHeight = blocks[blocks.length - 1].height;
    if (withTransaction) {
      const transactions = await global.app.sdb.findAll('Transaction', {
        condition: {
          height: { $gte: minHeight, $lte: maxHeight },
        },
      });
      const firstHeight = blocks[0].height;
      for (const t of transactions) {
        const h = t.height;
        const b = blocks[h - firstHeight];
        if (b) {
          if (!b.transactions) {
            b.transactions = [];
          }
          b.transactions.push(t);
        }
      }
    }

    return blocks;
  };

  public loadBlocksFromPeer = async (peer: PeerNode, id: string) => {
    let loaded = false;
    let count = 0;
    let lastCommonBlockId = id;

    await pWhilst(
      () => !loaded && count < 30,
      async () => {
        count++;
        const limit = 200;
        const params = {
          limit,
          lastBlockId: lastCommonBlockId,
        };
        let body;
        try {
          body = await this.modules.peer.request('blocks', params, peer);
        } catch (err) {
          throw new Error(`Failed to request remote peer: ${err}`);
        }
        if (!body) {
          throw new Error('Invalid response for blocks request');
        }
        const blocks = body.blocks;
        if (!Array.isArray(blocks) || blocks.length === 0) {
          loaded = true;
        }
        const num = Array.isArray(blocks) ? blocks.length : 0;
        const address = `${peer.host}:${peer.port - 1}`;
        this.library.logger.info(`Loading ${num} blocks from ${address}`);
        try {
          for (const block of blocks) {
            await this.processBlock(block, { syncing: true });
            lastCommonBlockId = block.id;
            this.library.logger.info(
              `Block ${block.id} loaded from ${address} at`,
              block.height
            );
          }
        } catch (e) {
          this.library.logger.error('Failed to process synced block', e);
          throw e;
        }
      }
    );
  };

  public generateBlock = async (keypair: KeyPair, timestamp: number) => {
    const unconfirmedList = this.modules.transactions.getUnconfirmedTransactionList();
    const payloadHash = crypto.createHash('sha256');
    let payloadLength = 0;
    let fees = 0;
    for (const transaction of unconfirmedList) {
      fees += transaction.fee;
      const bytes = TransactionBase.getBytes(transaction);
      // TODO check payload length when process remote block
      if (payloadLength + bytes.length > maxPayloadLength) {
        throw new Error('Playload length outof range');
      }
      payloadHash.update(bytes);
      payloadLength += bytes.length;
    }
    const height = this.lastBlock.height + 1;
    const block: IBlock = {
      version: 0,
      delegate: keypair.publicKey.toString('hex'),
      height,
      prevBlockId: this.lastBlock.id,
      timestamp,
      transactions: unconfirmedList,
      count: unconfirmedList.length,
      fees,
      payloadHash: payloadHash.digest().toString('hex'),
      reward: this.blockreward.calculateReward(height),
      signature: null,
      id: null,
    };

    block.signature = BlockBase.sign(block, keypair);
    block.id = BlockBase.getId(block);

    let activeKeypairs: KeyPair[];
    try {
      activeKeypairs = await this.modules.delegates.getActiveDelegateKeypairs(
        block.height
      );
    } catch (e) {
      throw new Error(`Failed to get active delegate keypairs: ${e}`);
    }

    const id = block.id;
    assert(
      activeKeypairs && activeKeypairs.length > 0,
      'Active keypairs should not be empty'
    );
    this.library.logger.info(
      `get active delegate keypairs len: ${activeKeypairs.length}`
    );
    const localVotes = ConsensusBase.createVotes(activeKeypairs, block);
    if (ConsensusBase.hasEnoughVotes(localVotes)) {
      this.modules.transactions.clearUnconfirmed();
      await this.processBlock(block, {
        local: true,
        broadcast: true,
        votes: localVotes,
      });
      this.library.logger.info(
        `Forged new block id: ${id}, height: ${height}, round: ${RoundBase.calculateRound(
          height
        )}, slot: ${slots.getSlotNumber(block.timestamp)}, reward: ${
          block.reward
        }`
      );
      return;
    }
    if (!this.library.config.publicIp) {
      this.library.logger.error('No public ip');
      return;
    }
    const serverAddr = `${this.library.config.publicIp}:${
      this.library.config.peerPort
    }`;
    let propose: BlockPropose;
    try {
      propose = ConsensusBase.createPropose(keypair, block, serverAddr);
    } catch (e) {
      this.library.logger.error('Failed to create propose', e);
      return;
    }
    this.library.modules.consensusManagement.setPendingBlock(block);
    this.library.modules.consensusManagement.addPendingVotes(localVotes);
    this.proposeCache[propose.hash] = true;
    this.privIsCollectingVotes = true;
    this.library.bus.message('onNewPropose', propose, true);
    return;
  };

  // Events
  public onReceiveBlock = (block: IBlock, votes: ManyVotes) => {
    if (this.modules.loader.syncing() || !this.loaded) {
      return;
    }

    if (this.blockCache[block.id]) {
      return;
    }
    this.blockCache[block.id] = true;

    this.library.sequence.add(async cb => {
      if (
        block.prevBlockId === this.lastBlock.id &&
        this.lastBlock.height + 1 === block.height
      ) {
        this.library.logger.info(
          `Received new block id: ${block.id}` +
            ` height: ${block.height}` +
            ` round: ${RoundBase.calculateRound(
              this.modules.blocks.getLastBlock().height
            )}` +
            ` slot: ${slots.getSlotNumber(block.timestamp)}`
        );
        const pendingTrsMap = new Map<string, Transaction>();
        try {
          const pendingTrs = this.modules.transactions.getUnconfirmedTransactionList();
          for (const t of pendingTrs) {
            pendingTrsMap.set(t.id, t);
          }
          this.modules.transactions.clearUnconfirmed();
          await global.app.sdb.rollbackBlock(this.lastBlock.height);
          await this.processBlock(block, { votes, broadcast: true });
        } catch (e) {
          this.library.logger.error('Failed to process received block', e);
        } finally {
          for (const t of block.transactions) {
            pendingTrsMap.delete(t.id);
          }
          try {
            const redoTransactions = [...pendingTrsMap.values()];
            await this.modules.transactions.processUnconfirmedTransactionsAsync(
              redoTransactions
            );
          } catch (e) {
            this.library.logger.error(
              'Failed to redo unconfirmed transactions',
              e
            );
          }
          return cb();
        }
      }
      if (
        block.prevBlockId !== this.lastBlock.id &&
        this.lastBlock.height + 1 === block.height
      ) {
        this.modules.delegates.fork(block, 1);
        return cb('Fork');
      }
      if (
        block.prevBlockId === this.lastBlock.prevBlockId &&
        block.height === this.lastBlock.height &&
        block.id !== this.lastBlock.id
      ) {
        this.modules.delegates.fork(block, 5);
        return cb('Fork');
      }
      if (block.height > this.lastBlock.height + 1) {
        this.library.logger.info(
          `receive discontinuous block height ${block.height}`
        );
        this.modules.loader.startSyncBlocks(this.lastBlock);
        return cb();
      }
      return cb();
    });
  };

  public onReceivePropose = (propose: BlockPropose) => {
    if (this.modules.loader.syncing() || !this.loaded) {
      return;
    }
    if (this.proposeCache[propose.hash]) {
      return;
    }
    this.proposeCache[propose.hash] = true;

    this.library.sequence.add(cb => {
      if (
        this.lastPropose &&
        this.lastPropose.height === propose.height &&
        this.lastPropose.generatorPublicKey === propose.generatorPublicKey &&
        this.lastPropose.id !== propose.id
      ) {
        this.library.logger.warn(
          `generate different block with the same height, generator: ${
            propose.generatorPublicKey
          }`
        );
        return setImmediate(cb);
      }
      if (propose.height !== this.lastBlock.height + 1) {
        this.library.logger.debug(
          `invalid propose height, proposed height: "${
            propose.height
          }", lastBlock.height: "${this.lastBlock.height}"`,
          propose
        );
        if (propose.height > this.lastBlock.height + 1) {
          this.library.logger.info(
            `receive discontinuous propose height ${propose.height}`
          );
          this.modules.loader.startSyncBlocks(this.lastBlock);
        }
        return setImmediate(cb);
      }
      if (this.lastVoteTime && Date.now() - this.lastVoteTime < 5 * 1000) {
        this.library.logger.debug('ignore the frequently propose');
        return setImmediate(cb);
      }
      this.library.logger.info(
        `receive propose height ${propose.height} bid ${propose.id}`
      );
      return async.waterfall(
        [
          async next => {
            try {
              await this.modules.delegates.validateProposeSlot(propose);
              next();
            } catch (err) {
              next(err.toString());
            }
          },
          async next => {
            try {
              const result = ConsensusBase.acceptPropose(propose);
              next();
            } catch (err) {
              next(err);
            }
          },
          async next => {
            const activeKeypairs = await this.modules.delegates.getActiveDelegateKeypairs(
              propose.height
            );
            next(undefined, activeKeypairs);
          },
          async (activeKeypairs: KeyPair[], next: Next) => {
            if (activeKeypairs && activeKeypairs.length > 0) {
              const votes = ConsensusBase.createVotes(activeKeypairs, propose);
              this.library.logger.debug(
                `send votes height ${votes.height} id ${votes.id} sigatures ${
                  votes.signatures.length
                }`
              );
              await this.modules.transport.sendVotes(votes, propose.address);
              this.lastVoteTime = Date.now();
              this.lastPropose = propose;
            }
            setImmediate(next);
          },
        ],
        (err: any) => {
          if (err) {
            this.library.logger.error(`onReceivePropose error: ${err}`);
          }
          this.library.logger.debug('onReceivePropose finished');
          cb();
        }
      );
    });
  };

  public onReceiveVotes = (votes: ManyVotes) => {
    if (this.modules.loader.syncing() || !this.loaded) {
      return;
    }
    this.library.sequence.add(cb => {
      const totalVotes = this.library.modules.consensusManagement.addPendingVotes(
        votes
      );
      if (totalVotes && totalVotes.signatures) {
        this.library.logger.debug(
          `receive new votes, total votes number ${
            totalVotes.signatures.length
          }`
        );
      }
      if (ConsensusBase.hasEnoughVotes(totalVotes)) {
        const block = this.library.modules.consensusManagement.getPendingBlock();
        const height = block.height;
        const id = block.id;
        return (async () => {
          try {
            this.modules.transactions.clearUnconfirmed();
            await this.processBlock(block, {
              votes: totalVotes,
              local: true,
              broadcast: true,
            });
            this.library.logger.info(
              `Forged new block id: ${id}, height: ${height}, round: ${RoundBase.calculateRound(
                height
              )}, slot: ${slots.getSlotNumber(block.timestamp)}, reward: ${
                block.reward
              }`
            );
          } catch (err) {
            this.library.logger.error(
              `Failed to process confirmed block height: ${height} id: ${id} error: ${err}`
            );
          }
          cb();
        })();
      }
      return setImmediate(cb); // todo, check if correct. Is not
    });
  };

  public isCollectingVotes = () => this.privIsCollectingVotes;

  cleanup = cb => {
    this.library.logger.debug('Cleaning up core/blocks');
    this.loaded = false;
    cb();
  };

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope;

    this.loaded = true;

    return (async () => {
      try {
        const count = global.app.sdb.blocksCount;
        this.library.logger.info('Blocks found:', count);
        if (!count) {
          this.setLastBlock({ height: -1 });
          await this.processBlock(this.genesisBlock, {});
        } else {
          const block = await global.app.sdb.getBlockByHeight(count - 1);
          this.setLastBlock(block);
        }
        this.library.bus.message('onBlockchainReady');
      } catch (e) {
        this.library.logger.error('Failed to prepare local blockchain', e);
        process.exit(0);
      }
    })();
  };
}
