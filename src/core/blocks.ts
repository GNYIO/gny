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
  IState,
} from '../interfaces';
import pWhilst from 'p-whilst';
import { BlockBase } from '../base/block';
import { TransactionBase } from '../base/transaction';
import { ConsensusBase } from '../base/consensus';
import { RoundBase } from '../base/round';
import { BlocksCorrect } from './blocks-correct';
import { copyObject } from '../base/helpers';
import { Block } from '../../packages/database-postgres/entity/Block';

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
    options: Pick<ProcessBlockOptions, 'votes'>,
    delegateList: string[]
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

    if (!BlockBase.verifySignature(block)) {
      throw new Error('Failed to verify block signature');
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
    if (BlocksCorrect.AreTransactionsDuplicated(block.transactions)) {
      throw new Error(`Duplicate transaction id in block ${block.id}`);
    }
    if (!BlocksCorrect.CanAllTransactionsBeSerialized(block.transactions)) {
      throw new Error('Failed to get transaction bytes');
    }

    const totalFee = BlocksCorrect.getFeesOfAll(block.transactions);

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
      if (!votes.signatures) {
        throw new Error('Votes signature is not correct');
      }
      if (!ConsensusBase.hasEnoughVotesRemote(votes)) {
        throw new Error('Not enough remote votes');
      }
      await this.verifyBlockVotes(block, votes, delegateList);
    }
  };

  public verifyBlockVotes = async (
    block: IBlock,
    votes: ManyVotes,
    delegateList: string[]
  ) => {
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

    try {
      if (BlocksCorrect.AreTransactionsDuplicated(block.transactions)) {
        throw new Error(`Duplicate transaction in block`);
      }

      for (const transaction of block.transactions) {
        await this.modules.transactions.applyUnconfirmedTransactionAsync(
          transaction
        );
      }
    } catch (e) {
      this.library.logger.error(`Failed to apply block ${e}`);
      throw new Error(`Failed to apply block: ${e}`);
    }
  };

  public CheckBlockEffect(block: IBlock, options: ProcessBlockOptions) {
    if (!block.transactions) block.transactions = [];
    if (!options.local) {
      try {
        block = BlockBase.normalizeBlock(block);
      } catch (e) {
        this.library.logger.error(`Failed to normalize block: ${e}`, block);
        throw e;
      }

      // TODO use bloomfilter
      for (let i = 0; i < block.transactions.length; ++i) {
        block.transactions[i] = TransactionBase.normalizeTransaction(
          block.transactions[i]
        );
      }
    }
    return block; // important
  }

  public async CheckBlockWithDbAccessIO(
    block: IBlock,
    options: ProcessBlockOptions,
    delegateList: string[]
  ) {
    if (!options.local) {
      await this.verifyBlock(block, options, delegateList);

      await BlocksCorrect.IsBlockAlreadyInDbIO(block);

      if (block.height !== 0) {
        try {
          await this.modules.delegates.validateBlockSlot(block);
        } catch (e) {
          this.library.logger.error(e);
          throw new Error(`Can't verify slot: ${e}`);
        }
      }

      await BlocksCorrect.AreAnyTransactionsAlreadyInDbIO(block.transactions);
    }

    return block; // important, block gets modified
  }

  public async ProcessBlockDbIO(block: Block, options: ProcessBlockOptions) {
    await global.app.sdb.beginBlock(block);

    try {
      if (!options.local) {
        await this.applyBlock(block);
      }

      await this.saveBlockTransactions(block);
      await this.applyRound(block);
      await global.app.sdb.commitBlock();
    } catch (e) {
      await global.app.sdb.rollbackBlock();
      throw e;
    }
  }

  public ProcessBlockEffect(state: IState, block: Block) {
    state.lastBlock = block;
    return state;
  }

  public ProcessBlockCleanupEffect(state: IState) {
    state.blockCache = {};
    state.proposeCache = {};
    state.lastVoteTime = null;
    state.privIsCollectingVotes = false;

    state = this.library.modules.consensusManagement.clearState(state);

    return state;
  }

  public ProcessBlockFireEvents(block: Block, options: ProcessBlockOptions) {
    if (options.broadcast && options.local) {
      options.votes.signatures = options.votes.signatures.slice(0, 6);
      this.library.bus.message('onNewBlock', block, options.votes);
    }
    this.library.bus.message('onProcessBlock', block);
  }

  public processBlock = async (
    state: IState,
    block: IGenesisBlock | any,
    options: ProcessBlockOptions,
    delegateList: string[]
  ) => {
    if (!this.loaded) throw new Error('Blockchain is loading');

    try {
      block = this.CheckBlockEffect(block, options);
      block = await this.CheckBlockWithDbAccessIO(block, options, delegateList);

      await this.ProcessBlockDbIO(block, options);

      state = this.ProcessBlockEffect(state, block);

      this.ProcessBlockFireEvents(block, options);
    } catch (fe) {
      this.library.logger.error('save block error: ', fe);
    } finally {
      state = this.ProcessBlockCleanupEffect(state);
    }
    return state;
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

  public generateBlock = async (
    old: IState,
    activeDelegates: KeyPair[],
    unconfirmedTransactions: Transaction[],
    keypair: KeyPair,
    timestamp: number,
    delegateList: string[]
  ) => {
    let state = copyObject(old) as IState;

    // TODO somehow fuel the state with the default state!

    if (
      BlocksCorrect.areTransactionsExceedingPayloadLength(
        unconfirmedTransactions
      )
    ) {
      throw new Error('Playload length outof range');
    }

    const newBlock = BlocksCorrect.generateBlockShort(
      keypair,
      timestamp,
      state.lastBlock,
      unconfirmedTransactions
    );

    if (BlocksCorrect.NotEnoughActiveKeyPairs(activeDelegates)) {
      throw new Error('not enough active delegates');
    }

    const localVotes = ConsensusBase.createVotes(activeDelegates, newBlock);

    if (ConsensusBase.hasEnoughVotes(localVotes)) {
      this.modules.transactions.clearUnconfirmed();
      const options: ProcessBlockOptions = {
        local: true,
        broadcast: true,
        votes: localVotes,
      };
      const returnedState = await this.processBlock(
        state,
        newBlock,
        options,
        delegateList
      );
      return returnedState; // important
    }

    /*
      not enough votes, so create a block propose and send it to all peers
    */

    if (!this.library.config.publicIp) {
      throw new Error('No public ip'); // throw or simple return?
    }

    const propose = BlocksCorrect.ManageProposeCreation(keypair, newBlock);

    state.pendingBlock = newBlock;

    const result = this.library.modules.consensusManagement.addPendingVotes(
      state,
      localVotes
    );
    state = result.state;

    state.proposeCache[propose.hash] = true;
    state.privIsCollectingVotes = true;

    this.library.bus.message('onNewPropose', propose, true);
    return state;
  };

  // Events
  // public onReceiveBlock = (block: IBlock, votes: ManyVotes) => {
  //   if (this.modules.loader.syncing() || !this.loaded) {
  //     return;
  //   }

  //   if (this.blockCache[block.id]) {
  //     return;
  //   }
  //   this.blockCache[block.id] = true;

  //   this.library.sequence.add(async cb => {
  //     if (
  //       block.prevBlockId === this.lastBlock.id &&
  //       this.lastBlock.height + 1 === block.height
  //     ) {
  //       this.library.logger.info(
  //         `Received new block id: ${block.id}` +
  //           ` height: ${block.height}` +
  //           ` round: ${RoundBase.calculateRound(
  //             this.modules.blocks.getLastBlock().height
  //           )}` +
  //           ` slot: ${slots.getSlotNumber(block.timestamp)}`
  //       );
  //       const pendingTrsMap = new Map<string, Transaction>();
  //       try {
  //         const pendingTrs = this.modules.transactions.getUnconfirmedTransactionList();
  //         for (const t of pendingTrs) {
  //           pendingTrsMap.set(t.id, t);
  //         }
  //         this.modules.transactions.clearUnconfirmed();
  //         await global.app.sdb.rollbackBlock(this.lastBlock.height);
  //         await this.processBlock(block, { votes, broadcast: true });
  //       } catch (e) {
  //         this.library.logger.error('Failed to process received block', e);
  //       } finally {
  //         for (const t of block.transactions) {
  //           pendingTrsMap.delete(t.id);
  //         }
  //         try {
  //           const redoTransactions = [...pendingTrsMap.values()];
  //           await this.modules.transactions.processUnconfirmedTransactionsAsync(
  //             redoTransactions
  //           );
  //         } catch (e) {
  //           this.library.logger.error(
  //             'Failed to redo unconfirmed transactions',
  //             e
  //           );
  //         }
  //         return cb();
  //       }
  //     }
  //     if (
  //       block.prevBlockId !== this.lastBlock.id &&
  //       this.lastBlock.height + 1 === block.height
  //     ) {
  //       this.modules.delegates.fork(block, 1);
  //       return cb('Fork');
  //     }
  //     if (
  //       block.prevBlockId === this.lastBlock.prevBlockId &&
  //       block.height === this.lastBlock.height &&
  //       block.id !== this.lastBlock.id
  //     ) {
  //       this.modules.delegates.fork(block, 5);
  //       return cb('Fork');
  //     }
  //     if (block.height > this.lastBlock.height + 1) {
  //       this.library.logger.info(
  //         `receive discontinuous block height ${block.height}`
  //       );
  //       this.modules.loader.startSyncBlocks(this.lastBlock);
  //       return cb();
  //     }
  //     return cb();
  //   });
  // };

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
        const pendingBlock = this.library.modules.consensusManagement.getPendingBlock();
        const height = pendingBlock.height;
        const id = pendingBlock.id;
        return (async () => {
          try {
            this.modules.transactions.clearUnconfirmed();
            await this.processBlock(pendingBlock, {
              votes: totalVotes,
              local: true,
              broadcast: true,
            });
            this.library.logger.info(
              `Forged new block id: ${id}, height: ${height}, round: ${RoundBase.calculateRound(
                height
              )}, slot: ${slots.getSlotNumber(
                pendingBlock.timestamp
              )}, reward: ${pendingBlock.reward}`
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
