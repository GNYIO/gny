import async = require('async');
import { MAX_TXS_PER_BLOCK } from '@gny/utils';
import { generateAddress } from '@gny/utils';
import { BlockReward } from '@gny/utils';
import {
  KeyPair,
  ProcessBlockOptions,
  BlockPropose,
  Next,
  IBlock,
  ManyVotes,
  CommonBlockParams,
  CommonBlockResult,
  IRound,
  ICoreModule,
  UnconfirmedTransaction,
  P2PMessage,
  BlocksWrapperParams,
  IBlockWithTransactions,
} from '@gny/interfaces';
import { IState, IStateSuccess } from '../globalInterfaces';
import pWhilst from 'p-whilst';
import { BlockBase } from '@gny/base';
import { TransactionBase } from '@gny/base';
import { ConsensusBase } from '@gny/base';
import { RoundBase } from '@gny/base';
import {
  BlocksHelper,
  BlockMessageFitInLineResult as BlockFitsInLine,
} from './BlocksHelper';
import { Block, Variable, Info } from '@gny/database-postgres';
import { ConsensusHelper } from './ConsensusHelper';
import { StateHelper } from './StateHelper';
import Transactions from './transactions';
import Peer from './peer';
import Delegates from './delegates';
import Loader from './loader';
import { BigNumber } from 'bignumber.js';
import { Transaction } from '@gny/database-postgres';
import { Round } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';
import { Account } from '@gny/database-postgres';
import { slots } from '@gny/utils';
import * as PeerInfo from 'peer-info';
import { getB58String } from '@gny/p2p';

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

const blockReward = new BlockReward();
export type GetBlocksByHeight = (height: string) => Promise<IBlock>;

export default class Blocks implements ICoreModule {
  public static async getIdSequence2(
    height: string,
    getBlocksByHeightRange: (min: string, max: string) => Promise<Block[]>
  ) {
    try {
      const maxHeight = height;
      const minHeight = BigNumber.maximum(
        0,
        new BigNumber(maxHeight).minus(4).toFixed()
      ).toFixed();
      let blocks = await getBlocksByHeightRange(minHeight, maxHeight);
      blocks = blocks.reverse();
      const ids = blocks.map(b => b.id);
      const result: CommonBlockParams = {
        ids,
        min: minHeight,
        max: maxHeight,
      };
      return result;
    } catch (e) {
      throw new Error('getIdSequence2 failed');
    }
  }

  // todo look at core/loader
  public static getCommonBlock = async (
    peer: PeerInfo,
    lastBlockHeight: string
  ): Promise<IBlock> => {
    const params: CommonBlockParams = await Blocks.getIdSequence2(
      lastBlockHeight,
      global.app.sdb.getBlocksByHeightRange
    );

    let ret: CommonBlockResult;
    try {
      ret = await Peer.p2p.requestCommonBlock(peer, params);
    } catch (err) {
      global.app.logger.info(
        `Peer.request('commonBlock'): ${err &&
          err.response &&
          err.response.data &&
          err.response.data.error}`
      );
      throw new Error('commonBlock could not be requested');
    }

    if (!ret.common) {
      throw new Error('Common block not found');
    }

    // TODO: validate commonBlock

    return ret.common;
  };

  public static verifyBlock = (
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

    global.app.logger.debug(`verifyBlock, id: ${block.id}, h: ${block.height}`);

    if (
      !new BigNumber(state.lastBlock.height).plus(1).isEqualTo(block.height)
    ) {
      throw new Error('New block is not lastBlock.height +1');
    }

    if (!block.prevBlockId && !new BigNumber(block.height).isEqualTo(0)) {
      throw new Error('Previous block should not be null');
    }

    if (!BlockBase.verifySignature(block)) {
      throw new Error('Failed to verify block signature');
    }

    if (block.prevBlockId !== state.lastBlock.id) {
      throw new Error('Incorrect previous block hash');
    }

    if (!new BigNumber(block.height).isEqualTo(0)) {
      if (!BlocksHelper.verifyBlockSlot(state, Date.now(), block)) {
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

    if (!new BigNumber(totalFee).isEqualTo(block.fees)) {
      throw new Error('Invalid total fees');
    }

    const expectedReward = blockReward.calculateReward(block.height);
    if (!new BigNumber(expectedReward).isEqualTo(block.reward)) {
      throw new Error('Invalid block reward');
    }

    if (options.votes) {
      const votes = options.votes;
      if (block.height !== votes.height) {
        throw new Error('Votes height is not correct');
      }
      if (block.id !== votes.id) {
        global.library.logger.info(
          `block(${block.height}) id: ${block.id} does not match votes(${
            votes.height
          }) id: ${votes.id}`
        );
        throw new Error('Votes id is not correct');
      }
      if (!votes.signatures) {
        throw new Error('Votes signature is not correct');
      }
      if (!ConsensusBase.hasEnoughVotesRemote(votes)) {
        global.app.logger.info(
          `[votes] remote votes ("${votes.signatures.length}") are not enough!`
        );
        throw new Error('Not enough remote votes');
      }
      Blocks.verifyBlockVotes(votes, delegateList);

      global.app.logger.info(
        `[votes] all in all we got "${votes.signatures.length}" votes`
      );
    }
  };

  public static verifyBlockVotes = (
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

  /**
   * applyBlock() applies all transactions of a block
   * This will not run if the block is created by yourself, because
   * the transactions already got exected by the time they reached the
   * node.
   */
  public static applyBlock = async (state: IState, block: IBlock) => {
    global.app.logger.trace('enter applyblock');

    try {
      if (BlocksHelper.AreTransactionsDuplicated(block.transactions)) {
        throw new Error(`Duplicate transaction in block`);
      }

      for (const transaction of block.transactions) {
        await Transactions.applyUnconfirmedTransactionAsync(state, transaction);
      }
    } catch (e) {
      global.app.logger.error('Failed to apply block');
      global.app.logger.error(e);
      throw new Error(`Failed to apply block: ${e}`);
    }
  };

  public static CheckBlockEffect(block: IBlock, options: ProcessBlockOptions) {
    if (!block.transactions) block.transactions = [];
    if (!options.local) {
      try {
        // this validates the block and its transactions
        block = BlockBase.normalizeBlock(block);
      } catch (e) {
        global.app.logger.error(
          `Failed to normalize block ${JSON.stringify(block, null, 2)}`
        );
        global.app.logger.error(e);
        throw e;
      }
    }
    return block; // important
  }

  public static CheckBlock(
    state: IState,
    block: IBlock,
    options: ProcessBlockOptions,
    delegateList: string[]
  ) {
    Blocks.verifyBlock(state, block, options, delegateList);
    if (!new BigNumber(block.height).isEqualTo(0)) {
      Delegates.validateBlockSlot(block, delegateList);
    }
  }

  public static async CheckBlockWithDbAccessIO(
    block: IBlock,
    options: ProcessBlockOptions
  ) {
    if (!options.local) {
      await BlocksHelper.IsBlockAlreadyInDbIO(block);

      await BlocksHelper.AreAnyTransactionsAlreadyInDbIO(block.transactions);
    }
  }

  public static async ProcessBlockDbIO(
    state: IState,
    block: IBlock,
    options: ProcessBlockOptions
  ) {
    await global.app.sdb.beginBlock(block);

    try {
      if (!options.local) {
        await Blocks.applyBlock(state, block);
      }

      await Blocks.saveBlockTransactions(block);
      await Blocks.applyRound(block);
      await global.app.sdb.commitBlock();
    } catch (e) {
      await global.app.sdb.rollbackBlock();
      throw e;
    }
  }

  public static ProcessBlockCleanupEffect(state: IState) {
    state = BlocksHelper.ProcessBlockCleanup(state);
    state = ConsensusHelper.clearState(state);

    return state;
  }

  public static ProcessBlockFireEvents(
    block: IBlock,
    options: ProcessBlockOptions
  ) {
    if (options.broadcast && options.local) {
      options.votes.signatures = options.votes.signatures.slice(0, 6); // TODO: copy signatures first
      global.library.bus.message('onNewBlock', block, options.votes);
    }
    global.library.bus.message('onProcessBlock', block); // TODO is this used?
  }

  public static processBlock = async (
    state: IState,
    block: IBlock,
    options: ProcessBlockOptions,
    delegateList: string[]
  ) => {
    if (!StateHelper.ModulesAreLoaded())
      throw new Error('Blockchain is loading');

    let success = true;
    try {
      // check block fields
      block = Blocks.CheckBlockEffect(block, options);

      // Check block logic also to previous block
      Blocks.CheckBlock(state, block, options, delegateList);

      // Check block against DB
      await Blocks.CheckBlockWithDbAccessIO(block, options);

      await Blocks.ProcessBlockDbIO(state, block, options);

      state = BlocksHelper.SetLastBlock(state, block);

      Blocks.ProcessBlockFireEvents(block, options);
    } catch (error) {
      global.app.logger.error('save block error:');
      global.app.logger.error(error);
      success = false;
    } finally {
      state = Blocks.ProcessBlockCleanupEffect(state);
    }
    const result: IStateSuccess = {
      success: success,
      state,
    };
    return result;
  };

  public static saveBlockTransactions = async (block: IBlock) => {
    global.app.logger.trace(
      `Blocks#saveBlockTransactions height: ${block.height}`
    );

    for (let trs of block.transactions) {
      trs = TransactionBase.stringifySignatureAndArgs(trs);

      await global.app.sdb.create<Transaction>(Transaction, trs);
    }
    global.app.logger.trace('Blocks#save transactions');
  };

  public static increaseRoundData = async (
    modifier: { fee: string; reward: string },
    roundNumber: string
  ): Promise<{ fee: string; reward: string }> => {
    const round: IRound = {
      fee: String(0),
      reward: String(0),
      round: roundNumber,
    };
    await global.app.sdb.createOrLoad<Round>(Round, round);
    const result = await global.app.sdb.increase<Round>(Round, modifier, {
      round: roundNumber,
    });
    return result as { fee: string; reward: string };
    // removed .load() line
  };

  public static applyRound = async (block: IBlock) => {
    if (new BigNumber(block.height).isEqualTo(0)) {
      await Delegates.updateBookkeeper();
      return;
    }

    const address = generateAddress(block.delegate);
    await global.app.sdb.increase<Delegate>(
      Delegate,
      { producedBlocks: String(1) },
      { address }
    );

    const transFee = BlocksHelper.getFeesOfAll(block.transactions);

    const roundNumber = RoundBase.calculateRound(block.height);

    // TODO: refactor, this will not go good!
    const { fee, reward } = await Blocks.increaseRoundData(
      {
        fee: transFee,
        reward: block.reward,
      },
      String(roundNumber)
    );

    await Blocks.saveSlotStatistics(block);

    if (!new BigNumber(block.height).modulo(101).isEqualTo(0)) return;

    global.app.logger.debug(
      `----------------------on round ${roundNumber} end-----------------------`
    );

    const delegates = await Delegates.generateDelegateList(block.height);
    if (!delegates || !delegates.length) {
      throw new Error('no delegates');
    }
    global.app.logger.debug(`delegate length: ${delegates.length}`);

    const forgedBlocks = await global.app.sdb.getBlocksByHeightRange(
      new BigNumber(block.height).minus(100).toFixed(),
      new BigNumber(block.height).minus(1).toFixed()
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
      const adr = generateAddress(md);
      await global.app.sdb.increase<Delegate>(
        Delegate,
        { missedBlocks: String(1) },
        { address: adr }
      );
    }

    async function updateDelegate(
      publicKey: string,
      fee: string,
      reward: string
    ) {
      const delegateAdr = generateAddress(publicKey);
      await global.app.sdb.increase<Delegate>(
        Delegate,
        {
          fees: String(fee),
          rewards: String(reward),
        },
        {
          address: delegateAdr,
        }
      );
      // TODO should account be all cached?
      await global.app.sdb.increase<Account>(
        Account,
        {
          gny: new BigNumber(fee).plus(reward).toFixed(),
        },
        {
          address: delegateAdr,
        }
      );
    }

    const ratio = 1;

    const actualFees = new BigNumber(fee).times(ratio).toFixed();
    const feeAverage = new BigNumber(actualFees)
      .dividedToIntegerBy(delegates.length)
      .toFixed();
    const feeRemainder = new BigNumber(feeAverage)
      .times(delegates.length)
      .minus(actualFees)
      .toFixed();

    const actualRewards = new BigNumber(reward).times(ratio).toFixed();
    const rewardAverage = new BigNumber(actualRewards)
      .dividedToIntegerBy(delegates.length)
      .toFixed();
    const rewardRemainder = new BigNumber(rewardAverage)
      .times(delegates.length)
      .minus(actualRewards)
      .toFixed();

    for (const fd of forgedDelegates) {
      await updateDelegate(fd, feeAverage, rewardAverage);
    }
    await updateDelegate(block.delegate, feeRemainder, rewardRemainder);

    if (new BigNumber(block.height).modulo(101).isEqualTo(0)) {
      await Blocks.saveStatistics(block.height, block);

      await Delegates.updateBookkeeper();
    }
  };

  public static saveSlotStatistics = async (block: IBlock) => {
    const delegates = await Delegates.generateDelegateList(block.height);

    // save block slot number
    const currentSlot = slots.getSlotNumber(block.timestamp);
    const delegateKey = delegates[currentSlot % 101];

    const delegateNamesShuffled: string[] = [];
    for (let i = 0; i < delegates.length; ++i) {
      const one = await global.app.sdb.get<Delegate>(Delegate, {
        publicKey: delegates[i],
      });
      delegateNamesShuffled.push(one.username);
    }

    await global.app.sdb.createOrLoad<Info>(Info, {
      key: `delegate_slot_number_${block.height}`,
      value: JSON.stringify(
        {
          currentSlot: currentSlot,
          blockTimestamp: block.timestamp,
          delegatePosition: currentSlot % 101,
          delegateBlock: block.delegate,
          currentDelegate: delegateKey,
          delegateListShuffled: delegateNamesShuffled,
        },
        null,
        2
      ),
    });
  };

  public static saveStatistics = async (height: string, block: IBlock) => {
    // before (delegates for the past 101 blocks)
    const delegatesBeforeRaw = await global.app.sdb.get<Variable>(Variable, {
      key: 'round_bookkeeper',
    });
    const delegatesBefore = JSON.parse(delegatesBeforeRaw.value) as string[];

    const before: string[] = [];
    for (let i = 0; i < delegatesBefore.length; ++i) {
      const one = await global.app.sdb.get<Delegate>(Delegate, {
        publicKey: delegatesBefore[i],
      });
      before.push(one.username);
    }
    global.app.logger.trace(`before: ${JSON.stringify(before)} `);

    // after (delegates for the next 101 blocks)
    const afterRaw = await global.app.sdb.getAll<Delegate>(Delegate);
    const after = afterRaw
      .sort(Delegates.compare)
      .map(x => x.username)
      .slice(0, 101);
    global.app.logger.trace(`after: ${JSON.stringify(after)}`);

    const newDelegates = Array.from(
      BlocksHelper.differenceBetween2Sets(new Set(after), new Set(before))
    );
    const oldDelegates = Array.from(
      BlocksHelper.differenceBetween2Sets(new Set(before), new Set(after))
    );

    global.app.logger.info(
      `height: ${height}, newDelegates: ${JSON.stringify(newDelegates)}`
    );
    global.app.logger.info(
      `height: ${height}, oldDelegates: ${JSON.stringify(oldDelegates)}`
    );

    await global.app.sdb.createOrLoad<Info>(Info, {
      key: `delegates_change_${height}`,
      value: JSON.stringify({
        newDelegates: newDelegates,
        oldDelegates: oldDelegates,
      }),
    });

    await global.app.sdb.createOrLoad<Info>(Info, {
      key: `delegates_before_height_${height}`,
      value: JSON.stringify(before),
    });
  };

  public static loadBlocksFromPeer = async (peer: PeerInfo, id: string) => {
    // TODO is this function called within a "Sequence"
    let loaded = false;
    let count = 0;
    let lastCommonBlockId = id;

    global.app.logger.info(
      `start to sync 30 * 200 blocks. From peer: ${JSON.stringify(
        peer
      )}, last commonBlock: ${id}`
    );

    await pWhilst(
      () => !loaded && count < 30,
      async () => {
        count++;
        const limit = 200;
        const params: BlocksWrapperParams = {
          limit,
          lastBlockId: lastCommonBlockId,
        };
        let body: IBlockWithTransactions[];
        try {
          body = await Peer.p2p.requestBlocks(peer, params);
        } catch (err) {
          global.library.logger.error(
            JSON.stringify(err.response ? err.response.data : err.message)
          );
          throw new Error(`Failed to request remote peer: ${err}`);
        }
        if (!body) {
          throw new Error('Invalid response for blocks request');
        }
        const blocks = body as IBlockWithTransactions[];
        if (!Array.isArray(blocks) || blocks.length === 0) {
          loaded = true;
        }
        const num = Array.isArray(blocks) ? blocks.length : 0;

        global.app.logger.info(
          `Loading ${num} blocks from ${getB58String(peer)}`
        );
        try {
          for (const block of blocks) {
            let state = StateHelper.getState();

            const activeDelegates = await Delegates.generateDelegateList(
              block.height
            );
            const options: ProcessBlockOptions = {};

            const stateResult = await Blocks.processBlock(
              state,
              block,
              options,
              activeDelegates
            );
            state = stateResult.state;
            StateHelper.setState(state); // important

            if (stateResult.success) {
              lastCommonBlockId = block.id;
              global.app.logger.info(
                `Block ${block.id} loaded from ${getB58String(peer)} at ${
                  block.height
                }`
              );
            } else {
              global.app.logger.info(
                `Error during sync of Block ${
                  block.id
                } loaded from ${getB58String(peer)} at ${block.height}`
              );
              global.app.logger.info('sleep for 10seconds');
              await snooze(10 * 1000);
              loaded = true; // prepare exiting pWhilst loop
              break; // exit for loop
            }
          }
        } catch (e) {
          // Is it necessary to call the sdb.rollbackBlock()
          global.app.logger.error('Failed to process synced block');
          global.app.logger.error(e);
          loaded = true; // prepare exiting pWhilst loop
          throw e;
        }
      }
    );

    global.app.logger.info(
      `stop syncing from peer ${peer.host}:${peer.port - 1}`
    );
  };

  public static generateBlock = async (
    old: IState,
    activeDelegates: KeyPair[],
    unconfirmedTransactions: Array<UnconfirmedTransaction>,
    keypair: KeyPair,
    timestamp: number
  ) => {
    let state = StateHelper.copyState(old);

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

    global.library.logger.info(
      `[votes] create local block ${newBlock.id}, h: ${newBlock.height}`
    );

    const localVotes = ConsensusBase.createVotes(activeDelegates, newBlock);

    if (ConsensusBase.hasEnoughVotes(localVotes)) {
      global.library.logger.info(
        `[votes] we got enough local votes ("${
          localVotes.signatures.length
        }") to produce block ${newBlock.id}, h: ${newBlock.height}`
      );

      return {
        // important
        state,
        block: newBlock,
        votes: localVotes,
      };
    }

    global.library.logger.info(
      `[votes] only "${
        localVotes.signatures.length
      }" votes, not enough. Creating Block Propose for block ${
        newBlock.id
      }, h: ${newBlock.height}`
    );

    /*
      not enough votes, so create a block propose and send it to all peers
    */
    if (!global.Config.publicIp) {
      throw new Error('No public ip'); // throw or simple return?
    }
    if (!global.Config.peerPort) {
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

    global.library.bus.message('onNewPropose', propose);
    return {
      // important
      state,
      block: undefined,
      votes: undefined,
    };
  };

  // Events
  public static onReceiveBlock = (
    peerInfo: PeerInfo,
    block: IBlock,
    votes: ManyVotes
  ) => {
    // remove later
    global.library.logger.info(
      `[p2p] onReceiveBlock: ${JSON.stringify(block, null, 2)}`
    );

    if (StateHelper.IsSyncing() || !StateHelper.ModulesAreLoaded()) {
      // TODO access state
      return;
    }

    global.library.sequence.add(async cb => {
      let state = StateHelper.getState();

      const fitInLineResult = BlocksHelper.DoesTheNewBlockFitInLine(
        state,
        block
      );
      // TODO: rename LongFork, this is wrong
      if (fitInLineResult === BlockFitsInLine.LongFork) {
        global.library.logger.warn('Receive new block header from long fork');
        global.library.logger.info(
          `[syncing] received block h: ${block.height} from "${getB58String(
            peerInfo
          )}". seem that we are not up to date. Start syncing from a random peer`
        );
        Loader.startSyncBlocks(state.lastBlock);
        return cb();
      }
      if (fitInLineResult === BlockFitsInLine.SyncBlocks) {
        global.library.logger.info(
          `[syncing] BlockFitsInLine.SyncBlocks received, start syncing from ${peerInfo}`
        );
        Loader.syncBlocksFromPeer(peerInfo);
        return cb();
      }

      if (BlocksHelper.AlreadyReceivedThisBlock(state, block)) {
        return cb();
      }

      // TODO this should be saved already in case of an error
      state = BlocksHelper.MarkBlockAsReceived(state, block);

      if (fitInLineResult === BlockFitsInLine.Success) {
        const pendingTrsMap = new Map<string, UnconfirmedTransaction>();
        try {
          const pendingTrs = StateHelper.GetUnconfirmedTransactionList();
          for (const t of pendingTrs) {
            pendingTrsMap.set(t.id, t);
          }
          StateHelper.ClearUnconfirmedTransactions();
          await global.app.sdb.rollbackBlock(state.lastBlock.height);

          const delegateList = await Delegates.generateDelegateList(
            block.height
          );

          const options: ProcessBlockOptions = { votes, broadcast: true };
          global.library.logger.info(
            `[p2p] onReceiveBlock processBlock() block: ${block.id}, h: ${
              block.height
            }, options: ${options.votes.id} h: ${options.votes.height}`
          );

          const stateResult = await Blocks.processBlock(
            state,
            block,
            options,
            delegateList
          );
          state = stateResult.state;
          // TODO: save state?
        } catch (e) {
          global.app.logger.error('Failed to process received block');
          global.app.logger.error(e);
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
            global.app.logger.error('Failed to redo unconfirmed transactions');
            global.app.logger.error(e);
            // TODO: rollback?
          }

          // important
          StateHelper.setState(state);
          return cb();
        }
      }

      // this should never get here
      return cb();
    });
  };

  public static onReceivePropose = (
    propose: BlockPropose,
    message: P2PMessage
  ) => {
    const isSyncing = StateHelper.IsSyncing();
    const modulesAreLoaded = StateHelper.ModulesAreLoaded();

    if (isSyncing || !modulesAreLoaded) {
      global.library.logger.info(
        `[p2p] ignore onReceivePropose from "${
          propose.address
        }" (isSyncing: ${isSyncing}, modulesAreLoaded: ${modulesAreLoaded})`
      );
      return;
    }

    global.library.sequence.add(cb => {
      let state = StateHelper.getState();

      if (BlocksHelper.AlreadyReceivedPropose(state, propose)) {
        return setImmediate(cb);
      }
      state = BlocksHelper.MarkProposeAsReceived(state, propose);

      if (BlocksHelper.DoesNewBlockProposeMatchOldOne(state, propose)) {
        return setImmediate(cb);
      }
      // TODO: check
      const lastBlockPlus1 = new BigNumber(state.lastBlock.height)
        .plus(1)
        .toFixed();
      if (!new BigNumber(propose.height).isEqualTo(lastBlockPlus1)) {
        if (new BigNumber(propose.height).isGreaterThan(lastBlockPlus1)) {
          Loader.startSyncBlocks(state.lastBlock);
        }
        return setImmediate(cb);
      }
      if (state.lastVoteTime && Date.now() - state.lastVoteTime < 5 * 1000) {
        global.app.logger.debug('ignore the frequently propose');
        return setImmediate(cb);
      }

      // propose ok
      let activeDelegates: string[];
      return async.waterfall(
        [
          async next => {
            try {
              activeDelegates = await Delegates.generateDelegateList(
                propose.height
              );
              Delegates.validateProposeSlot(propose, activeDelegates);
              next();
            } catch (err) {
              next(err.toString());
            }
          },
          async next => {
            if (ConsensusBase.acceptPropose(propose)) {
              next();
            } else {
              next('did not accept propose');
            }
          },
          async next => {
            const activeKeypairs = Delegates.getActiveDelegateKeypairs(
              activeDelegates
            );
            next(undefined, activeKeypairs);
          },
          async (activeKeypairs: KeyPair[], next: Next) => {
            try {
              if (activeKeypairs && activeKeypairs.length > 0) {
                const votes = ConsensusBase.createVotes(
                  activeKeypairs,
                  propose
                );
                global.library.logger.info(
                  `created "${
                    votes.signatures.length
                  }" votes for propose of block: ${propose.id}, h: ${
                    propose.height
                  }`
                );

                const bundle = Peer.p2p;

                const peerId = await bundle.findPeerInfoInDHT(message);

                await bundle.pushVotesToPeer(peerId, votes);

                state = BlocksHelper.SetLastPropose(state, Date.now(), propose);
              }
            } catch (err) {
              global.library.logger.error(
                `[p2p] failed to create and push VOTES: "${err.message}"`
              );
              global.library.logger.error(err);
            }

            // important
            StateHelper.setState(state);
            setImmediate(next);
          },
        ],
        (err: any) => {
          if (err) {
            global.app.logger.error('onReceivePropose error');
            global.app.logger.error(err);
          }
          global.app.logger.debug('onReceivePropose finished');
          cb();
        }
      );
    });
  };

  public static onReceiveTransaction = (
    unconfirmedTrs: UnconfirmedTransaction
  ) => {
    const finishCallback = err => {
      if (err) {
        global.app.logger.warn(
          `Receive invalid transaction ${unconfirmedTrs.id}`
        );
        global.app.logger.warn(err);
      } else {
        // TODO: are peer-transactions not broadcasted to all other peers also?
        // library.bus.message('onUnconfirmedTransaction', transaction, true)
      }
    };

    global.library.logger.info(`[p2p] onReceiveTransaction`);

    global.library.sequence.add(cb => {
      if (StateHelper.IsSyncing()) {
        // TODO this should access state
        return cb();
      }

      const state = StateHelper.getState();
      if (
        !BlocksHelper.IsBlockchainReady(state, Date.now(), global.app.logger)
      ) {
        return cb();
      }

      Transactions.processUnconfirmedTransaction(state, unconfirmedTrs, cb);
    }, finishCallback);
  };

  public static onReceiveVotes = (votes: ManyVotes) => {
    if (StateHelper.IsSyncing() || !StateHelper.ModulesAreLoaded()) {
      global.library.logger.info(
        `[p2p] currently syncing ignored received Votes for height: ${
          votes.height
        }`
      );
      return;
    }

    global.library.sequence.add(async cb => {
      let state = StateHelper.getState();

      global.library.logger.info(`[p2p] add remote votes`);
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
          const delegateList = await Delegates.generateDelegateList(
            pendingBlock.height
          );

          global.library.logger.info(
            `[p2p] onReceiveVotes!!! processBlock() block: ${
              pendingBlock.id
            }, h: ${pendingBlock.height}, options: ${options.votes.id} h: ${
              options.votes.height
            }`
          );

          const stateResult = await Blocks.processBlock(
            state,
            pendingBlock,
            options,
            delegateList
          );
          state = stateResult.state;

          StateHelper.setState(state); // important
        } catch (err) {
          global.app.logger.error('Failed to process confirmed block:');
          global.app.logger.error(err);
        }
        return cb();
      } else {
        StateHelper.setState(state); // important
        return setImmediate(cb);
      }
    });
  };

  public static RunGenesisOrLoadLastBlock = async (
    old: IState,
    numberOfBlocksInDb: string | null,
    genesisBlock: IBlock,
    processBlock: (
      state: IState,
      block: IBlock,
      options: ProcessBlockOptions,
      delegateList: string[]
    ) => Promise<IStateSuccess>,
    getBlocksByHeight: GetBlocksByHeight
  ) => {
    let state = StateHelper.copyState(old);

    if (new BigNumber(0).isEqualTo(numberOfBlocksInDb)) {
      state = BlocksHelper.setPreGenesisBlock(state);

      const options: ProcessBlockOptions = {};
      const delegateList: string[] = [];
      const stateResult = await processBlock(
        state,
        genesisBlock,
        options,
        delegateList
      );
      state = stateResult.state;
    } else {
      const block = await getBlocksByHeight(
        new BigNumber(numberOfBlocksInDb).minus(1).toFixed()
      );
      state = BlocksHelper.SetLastBlock(state, block);
    }
    return state;
  };

  // Events
  public static onBind = () => {
    // this.loaded = true; // TODO: use stateK

    return global.library.sequence.add(
      async cb => {
        try {
          let state = StateHelper.getState();

          const numberOfBlocksInDb = global.app.sdb.blocksCount;
          state = await Blocks.RunGenesisOrLoadLastBlock(
            state,
            numberOfBlocksInDb,
            global.library.genesisBlock,
            Blocks.processBlock,
            global.app.sdb.getBlockByHeight
          );
          // important
          StateHelper.setState(state);

          // refactor, reunite
          StateHelper.SetBlockchainReady(true);

          if (global.Config.nodeAction === 'forging') {
            global.library.bus.message('onBlockchainReady');
          }

          if (
            typeof global.Config.nodeAction == 'string' &&
            global.Config.nodeAction.startsWith('rollback')
          ) {
            global.library.bus.message('onBlockchainRollback');
          }

          return cb();
        } catch (err) {
          global.app.logger.error('Failed to prepare local blockchain');
          global.app.logger.error(err);

          return cb('Failed to prepare local blockchain');
        }
      },
      err => {
        if (err) {
          global.app.logger.error(err.message);
          process.exit(0);
        }
      }
    );
  };

  public static onBlockchainRollback = async () => {
    global.app.logger.info(`executed onBlockchainRollback`);
    const replace = global.Config.nodeAction;
    const rollbackHeight = replace.split(':')[1];

    const lastBlock = global.app.sdb.lastBlock;
    global.app.logger.info(`currentHeight: "${lastBlock.height}"`);

    if (new BigNumber(lastBlock.height).isLessThanOrEqualTo(rollbackHeight)) {
      throw new Error(
        `can not rollback to "${rollbackHeight}". Current height is: "${
          lastBlock.height
        }"`
      );
    }

    // split into chunks of 100 blocks
    let tempHeight = new BigNumber(lastBlock.height);
    const targetHeight = new BigNumber(rollbackHeight);

    while (tempHeight.isGreaterThan(targetHeight)) {
      if (tempHeight.minus(100).isLessThan(targetHeight)) {
        tempHeight = targetHeight;
      } else {
        tempHeight = tempHeight.minus(100);
      }

      global.app.logger.info(`rollback to "${tempHeight}"`);
      await global.app.sdb.rollbackBlock(String(tempHeight));
    }

    global.app.logger.info(`successfully rolled back to ${rollbackHeight}`);
    process.exit(0);
  };
}
