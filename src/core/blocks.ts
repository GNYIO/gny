import async = require('async');
import { MAX_TXS_PER_BLOCK } from '../utils/constants';
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
  NewBlockMessage,
} from '../interfaces';
import pWhilst from 'p-whilst';
import { BlockBase } from '../base/block';
import { TransactionBase } from '../base/transaction';
import { ConsensusBase } from '../base/consensus';
import { RoundBase } from '../base/round';
import { BlocksHelper, BlockMessageFitInLineResult } from './BlocksHelper';
import { Block } from '../../packages/database-postgres/entity/Block';
import { ConsensusHelper } from './ConsensusHelper';
import { StateHelper } from './StateHelper';
import Transactions from './transactions';

const blockreward = new Blockreward();
export type GetBlocksByHeight = (height: number) => Promise<IBlock>;

export default class Blocks {
  private modules: Modules;
  private readonly library: IScope;
  private loaded: boolean = false;

  constructor(scope: IScope) {
    this.library = scope;
  }

  // priv methods

  private async getIdSequence2(height: number) {
    try {
      // TODO refactor
      throw new Error('todo: refactor');
      const maxHeight = Math.max(height /* this.lastBlock.height*/);
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

  public verifyBlock = (
    state: IState,
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

    if (block.prevBlockId !== state.lastBlock.id) {
      throw new Error('Incorrect previous block hash');
    }

    if (block.height !== 0) {
      const blockSlotNumber = slots.getSlotNumber(block.timestamp);
      const lastBlockSlotNumber = slots.getSlotNumber(
        state.lastBlock.timestamp
      );

      if (
        blockSlotNumber > slots.getSlotNumber() + 1 ||
        blockSlotNumber <= lastBlockSlotNumber
      ) {
        throw new Error(`Can't verify block timestamp: ${block.id}`);
      }
    }

    if (block.transactions.length > MAX_TXS_PER_BLOCK) {
      throw new Error(`Invalid amount of block assets: ${block.id}`);
    }
    if (block.transactions.length !== block.count) {
      throw new Error('Invalid transaction count');
    }
    if (BlocksHelper.AreTransactionsDuplicated(block.transactions)) {
      throw new Error(`Duplicate transaction id in block ${block.id}`);
    }
    if (!BlocksHelper.CanAllTransactionsBeSerialized(block.transactions)) {
      throw new Error('Failed to get transaction bytes');
    }

    const totalFee = BlocksHelper.getFeesOfAll(block.transactions);

    if (Number(totalFee) !== Number(block.fees)) {
      throw new Error('Invalid total fees');
    }

    const expectedReward = blockreward.calculateReward(block.height);
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
      this.verifyBlockVotes(votes, delegateList);
    }
  };

  public verifyBlockVotes = (votes: ManyVotes, delegateList: string[]) => {
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

  public applyBlock = async (state: IState, block: IBlock) => {
    this.library.logger.trace('enter applyblock');

    try {
      if (BlocksHelper.AreTransactionsDuplicated(block.transactions)) {
        throw new Error(`Duplicate transaction in block`);
      }

      for (const transaction of block.transactions) {
        await Transactions.applyUnconfirmedTransactionAsync(state, transaction);
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

  public CheckBlock(
    state: IState,
    block: IBlock,
    options: ProcessBlockOptions,
    delegateList: string[]
  ) {
    if (!options.local) {
      this.verifyBlock(state, block, options, delegateList);
      if (block.height !== 0) {
        this.modules.delegates.validateBlockSlot(block, delegateList);
      }
    }
  }

  public async CheckBlockWithDbAccessIO(
    block: IBlock,
    options: ProcessBlockOptions
  ) {
    if (!options.local) {
      await BlocksHelper.IsBlockAlreadyInDbIO(block);

      await BlocksHelper.AreAnyTransactionsAlreadyInDbIO(block.transactions);
    }
  }

  public async ProcessBlockDbIO(
    state: IState,
    block: Block,
    options: ProcessBlockOptions
  ) {
    await global.app.sdb.beginBlock(block);

    try {
      if (!options.local) {
        await this.applyBlock(state, block);
      }

      await this.saveBlockTransactions(block);
      await this.applyRound(block);
      await global.app.sdb.commitBlock();
    } catch (e) {
      await global.app.sdb.rollbackBlock();
      throw e;
    }
  }

  public ProcessBlockCleanupEffect(state: IState) {
    state = BlocksHelper.ProcessBlockCleanup(state);
    state = ConsensusHelper.clearState(state);

    return state;
  }

  public ProcessBlockFireEvents(block: Block, options: ProcessBlockOptions) {
    if (options.broadcast && options.local) {
      options.votes.signatures = options.votes.signatures.slice(0, 6); // TODO: copy signatures first
      this.library.bus.message('onNewBlock', block, options.votes);
    }
    this.library.bus.message('onProcessBlock', block); // TODO is this used?
  }

  public processBlock = async (
    state: IState,
    block: IGenesisBlock | any,
    options: ProcessBlockOptions,
    delegateList: string[]
  ) => {
    if (!this.loaded) throw new Error('Blockchain is loading');

    try {
      // check block fields
      block = this.CheckBlockEffect(block, options);

      // Check block logic also to previous block
      this.CheckBlock(state, block, options, delegateList);

      // Check block against DB
      await this.CheckBlockWithDbAccessIO(block, options);

      await this.ProcessBlockDbIO(state, block, options);

      state = BlocksHelper.SetLastBlock(state, block);

      this.ProcessBlockFireEvents(block, options);
    } catch (error) {
      this.library.logger.error('save block error: ', error);
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

    const address = addressHelper.generateAddress(block.delegate);
    await global.app.sdb.increase(
      'Delegate',
      { producedBlocks: 1 },
      { address }
    );

    const transFee = BlocksHelper.getFeesOfAll(block.transactions);

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
    if (!delegates || !delegates.length) {
      throw new Error('no delegates');
    }
    this.library.logger.debug('delegate length', delegates.length);

    const forgedBlocks = await global.app.sdb.getBlocksByHeightRange(
      block.height - 100,
      block.height - 1
    );
    const forgedDelegates: string[] = [
      ...forgedBlocks.map(b => b.delegate),
      block.delegate,
    ];

    const missedDelegates = delegates.filter(
      fd => !forgedDelegates.includes(fd)
    );
    for (let i = 0; i < missedDelegates.length; ++i) {
      const md = missedDelegates[i];
      const adr = addressHelper.generateAddress(md);
      await global.app.sdb.increase(
        'Delegate',
        { missedBlocks: 1 },
        { address: adr }
      );
    }

    async function updateDelegate(
      publicKey: string,
      fee: number,
      reward: number
    ) {
      const delegateAdr = addressHelper.generateAddress(publicKey);
      await global.app.sdb.increase(
        'Delegate',
        { fees: fee, rewards: reward },
        { address: delegateAdr }
      );
      // TODO should account be all cached?
      await global.app.sdb.increase(
        'Account',
        { gny: fee + reward },
        { address: delegateAdr }
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

  public loadBlocksFromPeer = async (peer: PeerNode, id: string) => {
    // TODO is this function called within a "Sequence"
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
            let state = BlocksHelper.getState();

            const activeDelegates = await this.modules.delegates.generateDelegateList(
              block.height
            );
            const options: ProcessBlockOptions = {};
            state = await this.processBlock(
              state,
              block,
              options,
              activeDelegates
            );

            lastCommonBlockId = block.id;
            this.library.logger.info(
              `Block ${block.id} loaded from ${address} at`,
              block.height
            );

            BlocksHelper.setState(state); // important
          }
        } catch (e) {
          // Is it necessary to call the sdb.rollbackBlock()
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
    timestamp: number
  ) => {
    let state = BlocksHelper.copyState(old);

    // TODO somehow fuel the state with the default state!

    const newBlock = BlocksHelper.generateBlockShort(
      keypair,
      timestamp,
      state.lastBlock,
      unconfirmedTransactions
    );

    if (BlocksHelper.NotEnoughActiveKeyPairs(activeDelegates)) {
      throw new Error('not enough active delegates');
    }

    const localVotes = ConsensusBase.createVotes(activeDelegates, newBlock);

    if (ConsensusBase.hasEnoughVotes(localVotes)) {
      return {
        // important
        state,
        block: newBlock,
        votes: localVotes,
      };
    }

    /*
      not enough votes, so create a block propose and send it to all peers
    */
    if (!this.library.config.publicIp) {
      throw new Error('No public ip'); // throw or simple return?
    }
    if (!this.library.config.peerPort) {
      throw new Error('No peer port'); // throw or simple return?
    }

    const config = global.Config; // global access is bad
    const propose = BlocksHelper.ManageProposeCreation(
      keypair,
      newBlock,
      config
    );

    state = ConsensusHelper.setPendingBlock(state, newBlock);

    state = ConsensusHelper.addPendingVotes(state, localVotes);

    state = BlocksHelper.MarkProposeAsReceived(state, propose);

    state = ConsensusHelper.CollectingVotes(state);

    this.library.bus.message('onNewPropose', propose);
    return {
      // important
      state,
      block: undefined,
      votes: undefined,
    };
  };

  public fork = (block: IBlock, cause: number) => {
    this.library.logger.info('Fork', {
      delegate: block.delegate,
      block: {
        id: block.id,
        timestamp: block.timestamp,
        height: block.height,
        prevBlockId: block.prevBlockId,
      },
      cause,
    });
  };

  // Events
  public onReceiveBlock = (
    newBlockMsg: NewBlockMessage,
    peer: PeerNode,
    block: IBlock,
    votes: ManyVotes
  ) => {
    if (StateHelper.IsSyncing() || !this.loaded) {
      // TODO access state
      return;
    }

    this.library.sequence.add(async cb => {
      let state = BlocksHelper.getState();

      // validate the received Block and NewBlockMessage against each other
      if (!BlocksHelper.IsNewBlockMessageAndBlockTheSame(newBlockMsg, block)) {
        this.library.logger.warn('NewBlockMessage and Block do not');
        return cb();
      }

      const fitInLineResult = BlocksHelper.DoesTheNewBlockMessageFitInLine(
        state,
        newBlockMsg
      );
      if (fitInLineResult === BlockMessageFitInLineResult.Exit) return cb();
      if (fitInLineResult === BlockMessageFitInLineResult.SyncBlocks) {
        this.modules.loader.syncBlocksFromPeer(peer);
        return cb();
      }

      // migrated from receivePeer_NewBlockHeader
      if (!state.lastBlock) {
        // state should always have a lastBlock? correct?
        this.library.logger.error('Last does block not exists');
        return cb();
      }

      if (BlocksHelper.AlreadyReceivedThisBlock(state, block)) {
        return cb();
      }

      state = BlocksHelper.MarkBlockAsReceived(state, block); // TODO this should be saved already in case of an error

      if (BlocksHelper.ReceivedBlockIsInRightOrder(state, block)) {
        const pendingTrsMap = new Map<string, Transaction>();
        try {
          const pendingTrs = StateHelper.GetUnconfirmedTransactionList();
          for (const t of pendingTrs) {
            pendingTrsMap.set(t.id, t);
          }
          StateHelper.ClearUnconfirmedTransactions();
          await global.app.sdb.rollbackBlock(state.lastBlock.height);

          const delegateList = await this.modules.delegates.generateDelegateList(
            block.height
          );
          const options: ProcessBlockOptions = { votes, broadcast: true };
          state = await this.processBlock(state, block, options, delegateList);
          // TODO: save state?
        } catch (e) {
          this.library.logger.error('Failed to process received block', e);
        } finally {
          // delete already executed transactions
          for (const t of block.transactions) {
            pendingTrsMap.delete(t.id);
          }
          try {
            const redoTransactions = [...pendingTrsMap.values()];
            await Transactions.processUnconfirmedTransactionsAsync(
              state,
              redoTransactions
            );
          } catch (e) {
            this.library.logger.error(
              'Failed to redo unconfirmed transactions',
              e
            );
            // TODO: rollback?
          }

          // important
          BlocksHelper.setState(state);
          return cb();
        }
      }
      if (
        block.prevBlockId !== state.lastBlock.id &&
        state.lastBlock.height + 1 === block.height
      ) {
        this.fork(block, 1);
        return cb('Fork');
      }
      if (
        block.prevBlockId === state.lastBlock.prevBlockId &&
        block.height === state.lastBlock.height &&
        block.id !== state.lastBlock.id
      ) {
        this.fork(block, 5);
        return cb('Fork');
      }
      if (block.height > state.lastBlock.height + 1) {
        this.library.logger.info(
          `receive discontinuous block height ${block.height}`
        );
        this.modules.loader.startSyncBlocks(state.lastBlock);
        return cb();
      }
      return cb();
    });
  };

  public onReceivePropose = (propose: BlockPropose) => {
    if (StateHelper.IsSyncing() || !this.loaded) {
      // TODO access state
      return;
    }

    this.library.sequence.add(cb => {
      let state = BlocksHelper.getState();

      if (BlocksHelper.AlreadyReceivedPropose(state, propose)) {
        return setImmediate(cb);
      }
      state = BlocksHelper.MarkProposeAsReceived(state, propose);

      if (BlocksHelper.DoesNewBlockProposeMatchOldOne(state, propose)) {
        return setImmediate(cb);
      }
      if (propose.height !== state.lastBlock.height + 1) {
        if (propose.height > state.lastBlock.height + 1) {
          this.modules.loader.startSyncBlocks(state.lastBlock);
        }
        return setImmediate(cb);
      }
      if (state.lastVoteTime && Date.now() - state.lastVoteTime < 5 * 1000) {
        this.library.logger.debug('ignore the frequently propose');
        return setImmediate(cb);
      }

      // propose ok
      let activeDelegates: string[];
      return async.waterfall(
        [
          async next => {
            try {
              activeDelegates = await this.modules.delegates.generateDelegateList(
                propose.height
              );
              this.modules.delegates.validateProposeSlot(
                propose,
                activeDelegates
              );
              next();
            } catch (err) {
              next(err.toString());
            }
          },
          async next => {
            try {
              ConsensusBase.acceptPropose(propose);
              next();
            } catch (err) {
              next(err);
            }
          },
          async next => {
            const activeKeypairs = this.modules.delegates.getActiveDelegateKeypairs(
              activeDelegates
            );
            next(undefined, activeKeypairs);
          },
          async (activeKeypairs: KeyPair[], next: Next) => {
            if (activeKeypairs && activeKeypairs.length > 0) {
              const votes = ConsensusBase.createVotes(activeKeypairs, propose);

              await this.modules.transport.sendVotes(votes, propose.address);

              state = BlocksHelper.SetLastPropose(state, Date.now(), propose);
            }

            // important
            BlocksHelper.setState(state);
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

  public onReceiveTransaction = (transaction: Transaction) => {
    const finishCallback = err => {
      if (err) {
        this.library.logger.warn(
          `Receive invalid transaction ${transaction.id}`,
          err
        );
      } else {
        // TODO: are peer-transactions not broadcasted to all other peers also?
        // library.bus.message('onUnconfirmedTransaction', transaction, true)
      }
    };

    this.library.sequence.add(cb => {
      if (StateHelper.IsSyncing()) {
        // TODO this should access state
        return cb();
      }

      const state = BlocksHelper.getState();
      if (!BlocksHelper.IsBlockchainReady(state, this.library.logger)) {
        return cb();
      }

      Transactions.processUnconfirmedTransaction(state, transaction, cb);
    }, finishCallback);
  };

  public onReceiveVotes = (votes: ManyVotes) => {
    if (StateHelper.IsSyncing() || !this.loaded) {
      // TODO: use state
      return;
    }

    this.library.sequence.add(async cb => {
      let state = BlocksHelper.getState();

      state = ConsensusHelper.addPendingVotes(state, votes);

      const totalVotes = state.pendingVotes;

      if (ConsensusBase.hasEnoughVotes(totalVotes)) {
        const pendingBlock = ConsensusHelper.getPendingBlock(state);

        try {
          StateHelper.ClearUnconfirmedTransactions();
          const options: ProcessBlockOptions = {
            votes: totalVotes,
            local: true,
            broadcast: true,
          };
          const delegateList = await this.modules.delegates.generateDelegateList(
            pendingBlock.height
          );
          state = await this.processBlock(
            state,
            pendingBlock,
            options,
            delegateList
          );

          BlocksHelper.setState(state); // important
        } catch (err) {
          this.library.logger.error(
            `Failed to process confirmed block: ${err}`
          );
        }
        return cb();
      } else {
        BlocksHelper.setState(state); // important
        return setImmediate(cb);
      }
    });
  };

  public cleanup = cb => {
    this.library.logger.debug('Cleaning up core/blocks');
    this.loaded = false;
    cb();
  };

  public async RunGenesisOrLoadLastBlock(
    old: IState,
    numberOfBlocksInDb: number | null,
    genesisBlock: IGenesisBlock,
    getBlocksByHeight: GetBlocksByHeight
  ) {
    let state = BlocksHelper.copyState(old);

    if (!numberOfBlocksInDb) {
      state = BlocksHelper.setPreGenesisBlock(state);

      const options: ProcessBlockOptions = {};
      const delegateList: string[] = [];
      state = await this.processBlock(
        state,
        genesisBlock,
        options,
        delegateList
      );
    } else {
      const block = await getBlocksByHeight(numberOfBlocksInDb - 1);
      state = BlocksHelper.SetLastBlock(state, block);
    }
    return state;
  }

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope;

    this.loaded = true; // TODO: use state

    return this.library.sequence.add(
      async cb => {
        try {
          let state = BlocksHelper.getState();

          const numberOfBlocksInDb = global.app.sdb.blocksCount;
          state = await this.RunGenesisOrLoadLastBlock(
            state,
            numberOfBlocksInDb,
            this.library.genesisBlock,
            global.app.sdb.getBlockByHeight
          );
          // important
          BlocksHelper.setState(state);

          this.library.bus.message('onBlockchainReady');
          return cb();
        } catch (err) {
          this.library.logger.error('Failed to prepare local blockchain', e);
          return cb('Failed to prepare local blockchain');
        }
      },
      err => {
        if (err) {
          process.exit(0);
        }
      }
    );
  };
}
