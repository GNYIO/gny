import { waterfall } from 'async';
import { MAX_TXS_PER_BLOCK } from '@gny/utils';
import { generateAddress } from '@gny/utils';
import { BlockReward } from '@gny/utils';
import {
  KeyPair,
  ProcessBlockOptions,
  BlockPropose,
  IBlock,
  ManyVotes,
  IRound,
  ICoreModule,
  UnconfirmedTransaction,
  P2PMessage,
  BlocksWrapperParams,
  IBlockWithTransactions,
} from '@gny/interfaces';
import { IState, IStateSuccess } from '../globalInterfaces.js';
import pWhilst from 'p-whilst';
import { BlockBase } from '@gny/base';
import { TransactionBase } from '@gny/base';
import { ConsensusBase } from '@gny/base';
import { BlocksHelper } from './BlocksHelper.js';
import { Variable } from '@gny/database-postgres';
import { ConsensusHelper } from './ConsensusHelper.js';
import { StateHelper } from './StateHelper.js';
import Transactions from './transactions.js';
import Peer from './peer.js';
import Delegates from './delegates.js';
import BigNumber from 'bignumber.js';
import { Transaction } from '@gny/database-postgres';
import { Round } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';
import { Account } from '@gny/database-postgres';
import { slots } from '@gny/utils';
import * as PeerId from 'peer-id';
import { ISpan, getSmallBlockHash } from '@gny/tracer';
import pImmediate from 'p-immediate';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

const blockReward = new BlockReward();
export type GetBlocksByHeight = (height: string) => Promise<IBlock>;

export default class Blocks implements ICoreModule {
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
  public static applyBlock = async (
    state: IState,
    block: IBlock,
    parentSpan: ISpan
  ) => {
    global.app.logger.trace('enter applyblock');

    const span = global.library.tracer.startSpan('apply block', {
      childOf: parentSpan.context(),
    });
    span.setTag('id', block.id);
    span.setTag('hash', getSmallBlockHash(block));
    span.setTag('height', block.height);

    try {
      if (BlocksHelper.AreTransactionsDuplicated(block.transactions)) {
        throw new Error(`Duplicate transaction in block`);
      }

      span.log({
        transactionsToExecute:
          (block.transactions && block.transactions.length) || 0,
      });
      for (const transaction of block.transactions) {
        const applyBlockTransactionsSpan = global.library.tracer.startSpan(
          'execute transaction (block)',
          {
            childOf: span.context(),
          }
        );

        try {
          await Transactions.applyUnconfirmedTransactionAsync(
            state,
            transaction,
            applyBlockTransactionsSpan
          );

          applyBlockTransactionsSpan.finish();
        } catch (err) {
          applyBlockTransactionsSpan.setTag('error', true);
          applyBlockTransactionsSpan.log({
            value: `error during applyUnconfirmedTransactionAsync: ${
              err.message
            }`,
            stack: err.stack,
          });
          applyBlockTransactionsSpan.finish();

          throw err;
        }
      }

      span.finish();
    } catch (e) {
      span.setTag('error', true);
      span.log({
        value: `Failed to apply block: ${e}`,
      });
      span.finish();

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
    options: ProcessBlockOptions,
    parentSpan: ISpan
  ) {
    const span = global.library.tracer.startSpan('process block db io', {
      childOf: parentSpan.context(),
    });
    span.setTag('hash', getSmallBlockHash(block));
    span.setTag('id', block.id);
    span.setTag('height', block.height);

    span.log({
      value: 'begin block',
    });

    const beginBlockSpan = global.library.tracer.startSpan('begin block', {
      childOf: span.context(),
    });
    beginBlockSpan.setTag('hash', getSmallBlockHash(block));
    beginBlockSpan.setTag('id', block.id);
    beginBlockSpan.setTag('height', block.height);
    beginBlockSpan.finish();

    await global.app.sdb.beginBlock(block);

    try {
      span.log({
        value: `isLocal: ${!!options.local}`,
      });

      // todo should ALWAYS execute (before a rollback)
      if (!options.local) {
        span.log({
          value: 'going to applyBlock',
        });

        await Blocks.applyBlock(state, block, span);
      } else {
        span.log({
          value: 'no applyBlock execution',
        });
      }

      await Blocks.saveBlockTransactions(block, span);
      await Blocks.applyRound(block, span);
      await global.app.sdb.commitBlock();

      span.finish();
    } catch (e) {
      span.setTag('error', true);
      span.log({
        value: `error during "process block db io", error: ${e}`,
      });
      span.finish();

      const rollbackBlockSpan = global.library.tracer.startSpan(
        'rollback Block',
        {
          childOf: span.context(),
        }
      );
      rollbackBlockSpan.setTag('height', block.height);
      rollbackBlockSpan.setTag('id', block.id);
      rollbackBlockSpan.setTag('hash', getSmallBlockHash(block));
      rollbackBlockSpan.finish();

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
    options: ProcessBlockOptions,
    span: ISpan
  ) {
    if (options.broadcast && options.local) {
      global.library.bus.message('onNewBlock', block, options.votes, span);
    }
  }

  public static processBlock = async (
    state: IState,
    block: IBlock,
    options: ProcessBlockOptions,
    delegateList: string[],
    span: ISpan
  ) => {
    if (!StateHelper.ModulesAreLoaded()) {
      throw new Error('Blockchain is loading');
    }

    span.setTag('processBlock', true);
    span.log({
      options,
    });

    let success = true;
    try {
      // check block fields
      block = Blocks.CheckBlockEffect(block, options);

      // Check block logic also to previous block
      Blocks.CheckBlock(state, block, options, delegateList);

      // Check block against DB
      await Blocks.CheckBlockWithDbAccessIO(block, options);

      await Blocks.ProcessBlockDbIO(state, block, options, span);

      state = BlocksHelper.SetLastBlock(state, block);

      Blocks.ProcessBlockFireEvents(block, options, span);
    } catch (error) {
      global.app.logger.error('save block error:');
      global.app.logger.error(error);

      span.setTag('error', true);
      span.log({
        value: `save block error: ${error}`,
      });

      success = false;
    } finally {
      state = Blocks.ProcessBlockCleanupEffect(state);
    }

    if (
      typeof global.Config.nodeAction == 'string' &&
      global.Config.nodeAction.startsWith('stopWithHeight')
    ) {
      const stopHeight = global.Config.nodeAction.split(':')[1];
      const lastHeight = state.lastBlock.height;

      if (new BigNumber(lastHeight).isEqualTo(stopHeight)) {
        const stopWithHeightSpan = global.library.tracer.startSpan(
          'stop with height'
        );
        stopWithHeightSpan.log({
          stopHeight,
          lastHeight,
        });
        stopWithHeightSpan.finish();

        global.library.logger.info(
          `[stopWithHeight] lastHeight: "${lastHeight}" === stopHeight: "${stopHeight}"`
        );
        global.library.logger.info(`[stopWithHeight] shutDownInXSeconds...`);

        global.library.bus.message('shutDownInXSeconds');
      }
    }

    const result: IStateSuccess = {
      success: success,
      state,
    };
    return result;
  };

  public static saveBlockTransactions = async (
    block: IBlock,
    parentSpan: ISpan
  ) => {
    const saveBlockTransaction = global.library.tracer.startSpan(
      'save block transactions',
      {
        childOf: parentSpan.context(),
      }
    );
    saveBlockTransaction.setTag('id', block.id);
    saveBlockTransaction.setTag('hash', getSmallBlockHash(block));
    saveBlockTransaction.setTag('height', block.height);

    global.app.logger.trace(
      `Blocks#saveBlockTransactions height: ${block.height}`
    );

    for (let trs of block.transactions) {
      const span = global.library.tracer.startSpan('transaction', {
        childOf: saveBlockTransaction.context(),
      });
      span.setTag('transactionId', trs.id);
      span.setTag('height', block.height);
      span.setTag('id', block.id);
      span.setTag('hash', getSmallBlockHash(block));

      trs = TransactionBase.stringifySignatureAndArgs(trs);

      span.log({
        transaction: trs,
      });

      await global.app.sdb.create<Transaction>(Transaction, trs);

      span.finish();
    }
    global.app.logger.trace('Blocks#save transactions');

    saveBlockTransaction.finish();
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

  public static applyRound = async (block: IBlock, parentSpan: ISpan) => {
    // height 0
    if (new BigNumber(block.height).isEqualTo(0)) {
      await Delegates.updateBookkeeper();

      return;
    }

    // return if not multiple of 101
    if (!new BigNumber(block.height).modulo(101).isEqualTo(0)) {
      global.app.logger.info({
        value: `exiting, because we round has not finished, modulo ${new BigNumber(
          block.height
        )
          .modulo(101)
          .toFixed()}`,
      });
      return;
    }

    // block height multiple of 101
    const span = global.library.tracer.startSpan('apply round', {
      childOf: parentSpan.context(),
    });
    span.setTag('height', block.height);

    const forgedBlocks = await global.app.sdb.getBlocksByHeightRange(
      new BigNumber(block.height).minus(100).toFixed(),
      new BigNumber(block.height).minus(1).toFixed()
    );
    forgedBlocks.push(block);

    const delegates101 = await Delegates.generateDelegateList(block.height);
    // forgedDelegates
    // missedDelegates

    const delegatesWhoMissedBlock = BlocksHelper.delegatesWhoMissedBlock(
      forgedBlocks,
      delegates101
    );

    // create round
    const round = BlocksHelper.getRoundInfoForBlocks(forgedBlocks);
    await global.app.sdb.create<Round>(Round, round);

    const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(
      forgedBlocks
    );
    const keys = Object.keys(result);

    // missed blocks
    for (let i = 0; i < delegatesWhoMissedBlock.length; ++i) {
      const one = delegatesWhoMissedBlock[i];

      const value = {
        missedBlocks: String(1),
      };

      await global.app.sdb.increase<Delegate>(Delegate, value, {
        publicKey: one,
      });
    }

    // produced blocks
    for (let i = 0; i < keys.length; ++i) {
      const publicKey = keys[i];
      const one = result[publicKey];
      const address = generateAddress(publicKey);

      // update Delegate
      const value = {
        fees: one.fee,
        rewards: one.reward,
        producedBlocks: String(one.producedBlocks),
      };

      await global.app.sdb.increase<Delegate>(Delegate, value, {
        address,
      });
      // update Account
      await global.app.sdb.increase<Account>(
        Account,
        {
          gny: new BigNumber(one.fee).plus(one.reward).toFixed(),
        },
        {
          address,
        }
      );
    }

    await Delegates.updateBookkeeper();

    span.log(result);
    span.finish();
  };

  public static saveSlotStatistics = async (block: IBlock, span: ISpan) => {
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

    span.log({
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

  public static saveStatistics = async (
    height: string,
    block: IBlock,
    span: ISpan
  ) => {
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

    span.log({
      key: `delegates_change_${height}`,
      value: JSON.stringify({
        newDelegates: newDelegates,
        oldDelegates: oldDelegates,
      }),
    });

    span.log({
      key: `delegates_before_height_${height}`,
      value: JSON.stringify(before),
    });
  };

  public static loadBlocksFromPeer = async (
    peer: PeerId,
    id: string,
    parentSpan: ISpan
  ) => {
    const span = global.library.tracer.startSpan('load blocks from peer', {
      childOf: parentSpan.context(),
    });
    span.setTag('syncing', true);
    span.setTag('targetPeerId', peer.toB58String());
    span.setTag('lastCommonBlockId', id);

    // TODO is this function called within a "Sequence"?
    let loaded = false;
    let count = 0;
    let lastCommonBlockId = id;

    global.app.logger.info(
      `start to sync 30 * 200 blocks. From peer: ${peer.toB58String()}, last commonBlock: ${id}`
    );

    span.log({
      value: `start to sync 30 * 200 blocks. From peer: ${peer.toB58String()}, last commonBlock: ${id}`,
    });

    await pWhilst(
      () => !loaded && count < 30,
      async () => {
        const syncSpan = global.library.tracer.startSpan('sync 200 blocks', {
          childOf: span.context(),
        });
        syncSpan.setTag('syncing', true);
        syncSpan.log({
          count,
        });

        count++;
        const limit = 200;
        const params: BlocksWrapperParams = {
          limit,
          lastBlockId: lastCommonBlockId,
        };

        syncSpan.log({
          params,
        });

        let body: IBlockWithTransactions[];
        try {
          body = await Peer.p2p.requestBlocks(peer, params, syncSpan);
        } catch (err) {
          global.library.logger.error(
            `failed to requestBlocks from "${peer.toB58String()}", error: ${
              err.message
            }`
          );

          syncSpan.setTag('error', true);
          syncSpan.log({
            value: `failed to requestBlocks from "${peer.toB58String()}", error: ${
              err.message
            }`,
          });

          syncSpan.finish();

          throw new Error(`Failed to request remote peer: ${err}`);
        }

        if (!body) {
          syncSpan.setTag('error', true);
          syncSpan.log({
            value: 'Invalid response for blocks request',
          });

          syncSpan.finish();

          throw new Error('Invalid response for blocks request');
        }

        const blocks = body as IBlockWithTransactions[];
        if (!Array.isArray(blocks) || blocks.length === 0) {
          syncSpan.log({
            loaded: true,
          });
          syncSpan.finish();

          loaded = true;
          return;
        }
        const num = Array.isArray(blocks) ? blocks.length : 0;

        global.app.logger.info(
          `Loading ${num} blocks from ${peer.toB58String()}`
        );
        syncSpan.log({
          value: `Loading ${num} blocks from ${peer.toB58String()}`,
        });
        syncSpan.finish();

        const multipleBlocksSpan = global.library.tracer.startSpan(
          'process multiple blocks',
          {
            childOf: syncSpan.context(),
          }
        );
        multipleBlocksSpan.setTag('syncing', true);

        try {
          for (const block of blocks) {
            const processBlockSpan = global.library.tracer.startSpan(
              'process block (syncing)',
              {
                childOf: multipleBlocksSpan.context(),
              }
            );
            processBlockSpan.setTag('syncing', true);

            let state = StateHelper.getState();
            const activeDelegates = await Delegates.generateDelegateList(
              block.height
            );
            const options: ProcessBlockOptions = {};

            processBlockSpan.setTag('hash', getSmallBlockHash(block as IBlock));
            processBlockSpan.setTag('height', block.height);
            processBlockSpan.setTag('id', block.id);
            processBlockSpan.setTag('syncingFrom', peer.toB58String());

            const stateResult = await Blocks.processBlock(
              state,
              block,
              options,
              activeDelegates,
              processBlockSpan
            );
            state = stateResult.state;
            StateHelper.setState(state); // important

            if (stateResult.success) {
              processBlockSpan.finish();

              lastCommonBlockId = block.id;
              global.app.logger.info(
                `Block ${block.id} loaded from ${peer.toB58String()} at ${
                  block.height
                }`
              );
            } else {
              processBlockSpan.setTag('error', true);
              processBlockSpan.log({
                value: `Error during sync of Block ${
                  block.id
                } loaded from ${peer.toB58String()} at ${block.height}`,
              });

              processBlockSpan.finish();

              const processBlockError = global.library.tracer.startSpan(
                'processBlock error',
                {
                  childOf: processBlockSpan.context(),
                }
              );
              processBlockError.finish();

              global.app.logger.info(
                `Error during sync of Block ${
                  block.id
                } loaded from ${peer.toB58String()} at ${block.height}`
              );
              global.app.logger.info('sleep for 10seconds');
              await snooze(10 * 1000);
              loaded = true; // prepare exiting pWhilst loop
              break; // exit for loop
            }
          }
        } catch (e) {
          // Is it necessary to call the sdb.rollbackBlock()
          // processBlockSpan.setTag('error', true);
          // processBlockSpan.log({
          //   value: `Failed to process synced block, error: ${err.message}`,
          // });
          // processBlockSpan.finish();

          multipleBlocksSpan.finish();

          global.app.logger.error('Failed to process synced block');
          global.app.logger.error(e);
          loaded = true; // prepare exiting pWhilst loop
          throw e;
        }

        multipleBlocksSpan.finish();
      }
    );
    global.app.logger.info(`stop syncing from peer "${peer.toB58String()}"`);

    span.log({
      value: `stop syncing from peer "${peer.toB58String()}"`,
    });
    span.finish();
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

    const span = global.library.tracer.startSpan('generate block');
    span.setTag('height', newBlock.height);
    span.setTag('hash', getSmallBlockHash(newBlock));

    if (BlocksHelper.NotEnoughActiveKeyPairs(activeDelegates)) {
      span.log({
        value: 'not enough active delegates',
      });
      span.setTag('error', true);
      span.finish();

      throw new Error('not enough active delegates');
    }

    global.library.logger.info(
      `[votes] create local block ${newBlock.id}, h: ${newBlock.height}`
    );

    const localVotes = ConsensusBase.createVotes(activeDelegates, newBlock);

    if (ConsensusBase.hasEnoughVotes(localVotes)) {
      span.log({
        value: `[votes] we got enough local votes ("${
          localVotes.signatures.length
        }") to produce block ${newBlock.id}, h: ${newBlock.height}`,
      });
      span.finish();

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
    const config = global.Config; // global access is bad
    const propose = BlocksHelper.ManageProposeCreation(
      keypair,
      newBlock,
      config
    );

    span.log({
      ownCreatedPropose: propose,
    });
    span.log({
      ownNewPendingBlock: newBlock,
    });

    state = ConsensusHelper.createPendingBlockAndVotes(
      state,
      newBlock,
      localVotes,
      span
    );

    state = BlocksHelper.MarkProposeAsReceived(state, propose);

    // so we can no longer process new incoming transactions

    span.setTag('privIsCollectingVotes', true);
    state = ConsensusHelper.CollectingVotes(state);

    span.finish();
    global.library.bus.message('onNewPropose', propose, span);
    return {
      // important
      state,
      block: undefined,
      votes: undefined,
    };
  };

  // Events
  public static onReceiveBlock = async (
    peerId: PeerId,
    block: IBlock,
    votes: ManyVotes,
    span: ISpan
  ) => {
    // check before if block fits in line
    const state = StateHelper.getState();
    const fitInLineResult = BlocksHelper.DoesTheNewBlockFitInLine(state, block);
    if (fitInLineResult === false) {
      global.library.logger.info(
        `[p2p] received block does not fit in line. newBlock:
        ${JSON.stringify(block, null, 2)}.
        currentBlock: ${JSON.stringify(state.lastBlock, null, 2)}`
      );
      span.log({
        receivedBlock: block,
      });
      span.log({
        lastBlock: state.lastBlock,
      });
      span.finish();
      return;
    }

    await global.app.mutex.runExclusive(async () => {
      let state = StateHelper.getState();

      span.log({
        lastBlock: state.lastBlock,
      });
      span.log({
        newBlock: block,
      });

      // check needs to be done with a new version of state
      // state could have changed since
      const fitInLineResult = BlocksHelper.DoesTheNewBlockFitInLine(
        state,
        block
      );

      if (fitInLineResult === false) {
        const longForkSpan = global.library.tracer.startSpan(
          'does not fit in line',
          {
            childOf: span.context(),
          }
        );

        global.library.logger.warn(
          'Receive new block header does not fit in line'
        );
        global.library.logger.info(
          `[syncing] received block h: ${
            block.height
          } from "${peerId.toB58String()}".`
        );

        longForkSpan.setTag('warning', true);
        longForkSpan.log({
          value: `received block h block h: ${
            block.height
          } from "${peerId.toB58String()}".`,
        });
        longForkSpan.finish();
        span.finish();

        return;
      }

      span.finish();

      if (fitInLineResult === true) {
        const processBlockSpan = global.library.tracer.startSpan(
          'process block (on receive block)',
          {
            childOf: span.context(),
          }
        );
        processBlockSpan.setTag('hash', getSmallBlockHash(block));
        processBlockSpan.setTag('height', block.height);
        processBlockSpan.setTag('id', block.id);

        const rollbackBlockSpan = global.library.tracer.startSpan(
          'rollback Block',
          {
            childOf: processBlockSpan.context(),
          }
        );

        try {
          StateHelper.ClearUnconfirmedTransactions();

          rollbackBlockSpan.setTag('height', block.height);
          rollbackBlockSpan.setTag('hash', getSmallBlockHash(block));
          rollbackBlockSpan.setTag('id', block.id);
          rollbackBlockSpan.setTag('lastBlockHeight', state.lastBlock.height);
          rollbackBlockSpan.log({
            lastBlock: state.lastBlock,
          });
          rollbackBlockSpan.log({
            value: `rollback to ${state.lastBlock.height}`,
          });

          await global.app.sdb.rollbackBlock(state.lastBlock.height);

          rollbackBlockSpan.finish();
        } catch (err) {
          global.library.logger.error('error during rolling back block');
          global.library.logger.error(err);
          rollbackBlockSpan.log({
            log: 'error during rolling back block',
          });
          rollbackBlockSpan.log({ err });
          rollbackBlockSpan.setTag('error', true);
          rollbackBlockSpan.finish();
          processBlockSpan.finish();

          return;
        }

        try {
          const delegateList = await Delegates.generateDelegateList(
            block.height
          );

          // need to broadcast?
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
            delegateList,
            processBlockSpan
          );
          state = stateResult.state;

          if (!stateResult.success) {
            const processBlockError = global.library.tracer.startSpan(
              'processBlock error',
              {
                childOf: processBlockSpan.context(),
              }
            );
            processBlockError.finish();
          }

          // important
          StateHelper.setState(state);

          processBlockSpan.finish();
        } catch (e) {
          processBlockSpan.setTag('error', true);
          processBlockSpan.log({
            value: `Failed to process received block ${e}`,
          });

          global.app.logger.error('Failed to process received block');
          global.app.logger.error(e);

          processBlockSpan.finish();

          return;
        }
      }

      // this is important
      return;
    });
  };

  public static onReceivePropose = async (
    propose: BlockPropose,
    message: P2PMessage,
    parentSpan: ISpan
  ) => {
    global.library.logger.info(`[p2p] onReceivePropose ${propose.id}`);

    const span = global.library.tracer.startSpan('push Votes', {
      childOf: parentSpan.context(),
    });
    span.setTag('height', propose.height);
    span.setTag('id', propose.id);
    span.setTag('hash', getSmallBlockHash(propose));
    span.setTag('proposeHash', propose.hash);

    await global.app.mutex.runExclusive(async () => {
      let state = StateHelper.getState();

      global.library.logger.info(`[p2p] onReceivePropose started sequence`);

      span.log({
        value: 'in sequence',
      });
      span.log({
        lastBlock: state.lastBlock,
        lastPropose: state.lastPropose,
      });
      global.library.logger.info(
        `[p2p] onReceivePropose.
        lastBlock: ${JSON.stringify(state.lastBlock, null, 2)}
        lastPropose: ${JSON.stringify(state.lastPropose, null, 2)}`
      );

      if (BlocksHelper.AlreadyReceivedPropose(state, propose)) {
        const alreadyReceivedSpan = global.library.tracer.startSpan(
          'already received propose',
          {
            childOf: span.context(),
            tags: {
              error: true,
              proposeHash: propose.hash,
            },
          }
        );
        alreadyReceivedSpan.log({
          value: 'already received propose',
        });
        global.library.logger.warn(
          `[p2p] onReceivePropose. already received propose`
        );
        alreadyReceivedSpan.log({
          hash: propose.hash,
          proposeCache: state.proposeCache,
        });

        alreadyReceivedSpan.finish();
        span.finish();

        await pImmediate();
        return;
      }
      state = BlocksHelper.MarkProposeAsReceived(state, propose);

      if (BlocksHelper.DoesNewBlockProposeMatchOldOne(state, propose)) {
        global.library.logger.error(
          `[p2p] onReceivePropose. propose matches old one`
        );
        span.setTag('error', true);
        span.log({
          value: 'propose matches old one',
        });
        span.finish();

        await pImmediate();
        return;
      }

      // TODO: check
      const lastBlockPlus1 = new BigNumber(state.lastBlock.height)
        .plus(1)
        .toFixed();
      if (!new BigNumber(propose.height).isEqualTo(lastBlockPlus1)) {
        global.library.logger.info(
          `received block propose (${
            propose.height
          }) that is not in line with block ${state.lastBlock.height}`
        );
        span.log({
          log: `received block propose that is not in line`,
          lastBlock: state.lastBlock,
          propose,
        });
        span.setTag('error', true);
        span.finish();

        await pImmediate();
        return;
      }

      if (state.lastVoteTime && Date.now() - state.lastVoteTime < 5 * 1000) {
        global.app.logger.debug('ignore the frequently propose');
        span.setTag('error', true);
        span.log({
          value: 'ignore the frequently propose',
        });
        span.finish();

        global.library.logger.info(
          `[p2p] onReceivePropose. ignore the frequently propose`
        );

        await pImmediate();
        return;
      }

      // propose ok
      let activeDelegates: string[];

      // new waterfall will jump to end function if
      // an error occurs
      // to get a var to the next function return array
      return waterfall(
        [
          async function waterfallOne() {
            activeDelegates = await Delegates.generateDelegateList(
              propose.height
            );
            span.log({
              value: 'going to validate propose slot',
            });
            global.library.logger.info(
              `[p2p] onReceivePropose. going to validate propose slot`
            );

            Delegates.validateProposeSlot(propose, activeDelegates);

            span.log({
              value: 'successfully validated propose slot',
            });
          },
          async function waterfallTwo() {
            span.log({
              value: 'going to accept propose',
            });
            global.library.logger.info(
              `[p2p] onReceivePropose. going to accept propose`
            );
            if (ConsensusBase.acceptPropose(propose)) {
              return [];
            } else {
              throw new Error('did not accept propose');
            }
          },
          async function waterfallThree() {
            span.log({
              value: 'get active delegate keypairs',
            });
            global.library.logger.info(
              `[p2p] onReceivePropose. get active delegate keypairs`
            );

            const activeKeypairs = Delegates.getActiveDelegateKeypairs(
              activeDelegates
            );
            return [activeKeypairs];
          },
          async function waterfallFour([activeKeypairs]) {
            try {
              span.log({
                value: `I got activeKeypairs: ${activeKeypairs &&
                  activeKeypairs.length}`,
              });
              global.library.logger.info(
                `[p2p] onReceivePropose. I got activeKeypairs ${activeKeypairs &&
                  activeKeypairs.length}`
              );

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

                span.log({
                  value: `going to push votes to ${peerId.toB58String()}`,
                  votes,
                });

                await bundle.pushVotesToPeer(peerId, votes, span);

                state = BlocksHelper.SetLastPropose(state, Date.now(), propose);
              }
            } catch (err) {
              global.library.logger.error(err);

              // important
              StateHelper.setState(state);
              global.library.logger.error(
                `[p2p] failed to create and push VOTES "${err.message}"`
              );
              throw new Error(
                `[p2p] failed to create and push VOTES "${err.message}"`
              );
            }

            // important
            StateHelper.setState(state);
            return [];
          },
        ],
        (err: Error, [result]) => {
          if (err) {
            span.setTag('error', true);
            span.log({
              value: `onReceivePropose error: ${err}`,
            });
            global.library.logger.error(`[p2p] onReceivePropose error: ${err}`);

            global.app.logger.error('onReceivePropose error');
            global.app.logger.error(err);
          }
          global.app.logger.debug('onReceivePropose finished');

          span.finish();
          return;
        }
      );
    });
  };

  public static onReceiveTransaction = async (
    unconfirmedTrs: UnconfirmedTransaction,
    parentSpan: ISpan
  ) => {
    const span = global.library.tracer.startSpan('execute transaction', {
      childOf: parentSpan.context(),
    });
    span.setTag('transactionId', unconfirmedTrs.id);
    span.setTag('senderId', unconfirmedTrs.senderId);

    global.library.logger.info(`[p2p] onReceiveTransaction`);

    await global.app.mutex.runExclusive(async () => {
      span.log({
        value: 'execute in sequence',
      });

      if (StateHelper.IsSyncing()) {
        span.setTag('error', true);
        span.setTag('syncing', true);
        span.log({
          value: 'is syncing',
        });
        span.log({
          value: 'not going to execute transaction',
        });

        span.finish();

        // TODO this should access state
        await pImmediate();
        return;
      }

      const state = StateHelper.getState();
      if (
        !BlocksHelper.IsBlockchainReady(state, Date.now(), global.app.logger)
      ) {
        span.setTag('error', true);
        span.log({
          value: 'blockchain is not ready',
        });
        span.finish();

        await pImmediate();
        return;
      }

      try {
        await Transactions.processUnconfirmedTransactionAsync(
          state,
          unconfirmedTrs,
          span
        );
      } catch (err) {
        span.setTag('error', true);
        span.log({
          value: `error while processing unconfirmed transaction: ${
            err.message
          }`,
        });
        span.finish();

        global.app.logger.warn(
          `Receive invalid transaction ${unconfirmedTrs.id}`
        );
        global.app.logger.warn(err);

        await pImmediate();
        return;
      }

      span.finish();

      await pImmediate();
      return;
    });
  };

  public static onReceiveVotes = async (votes: ManyVotes, span: ISpan) => {
    const isSyncing = StateHelper.IsSyncing();
    const modules = !StateHelper.ModulesAreLoaded();

    if (isSyncing || modules) {
      global.library.logger.info(
        `[p2p] currently syncing ignored received Votes for height: ${
          votes.height
        }`
      );

      span.setTag('error', true);
      span.log({
        value: `onReceiveVotes isSyncing: ${isSyncing}, modules: ${modules}`,
      });
      span.finish();

      return;
    }

    await global.app.mutex.runExclusive(async () => {
      let state = StateHelper.getState();

      // check if incoming votes aren't stale
      const lastBlock = StateHelper.getState().lastBlock;
      if (!new BigNumber(lastBlock.height).plus(1).isEqualTo(votes.height)) {
        span.log({
          value: 'incoming votes has different height',
        });
        span.log({
          value: `incoming votes height: ${
            votes.height
          } should be one greater than lastBlock: ${
            lastBlock.height
          }. This means, that lastBlock is already persisted and the votes are not necessary`,
        });
        span.log({
          incomingVotes: votes,
        });
        span.log({
          lastBlock,
        });
        span.finish();

        return;
      }

      // first we need to check if the votes fit in line
      if (!ConsensusHelper.doIncomingVotesFitInLine(state, votes)) {
        const errorSpan = global.library.tracer.startSpan(
          'incoming votes bad',
          {
            childOf: span.context(),
          }
        );
        errorSpan.setTag('error', true);
        errorSpan.log({
          value: 'incoming votes do not fit in line',
        });
        errorSpan.log({
          pendingBlock: state.pendingBlock,
        });
        errorSpan.log({
          pendingVotes: state.pendingVotes,
        });
        errorSpan.log({
          incomingVotes: votes,
        });
        errorSpan.finish();

        span.finish();

        return;
      }

      global.library.logger.info(`[p2p] add remote votes`);
      state = ConsensusHelper.addPendingVotes(state, votes, span);

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

          span.log({
            value: 'has enough votes',
            receivedVotes: (votes && votes.signatures.length) || 0,
            pendingVotes: (totalVotes && totalVotes.signatures.length) || 0,
          });
          span.finish();

          const processBlockSpan = global.library.tracer.startSpan(
            'process Block (on receive votes)',
            {
              childOf: span.context(),
            }
          );
          processBlockSpan.log({
            pendingBlock,
            totalVotes,
          });

          const stateResult = await Blocks.processBlock(
            state,
            pendingBlock,
            options,
            delegateList,
            processBlockSpan
          );
          state = stateResult.state;

          if (!stateResult.success) {
            const processBlockError = global.library.tracer.startSpan(
              'processBlock error',
              {
                childOf: processBlockSpan.context(),
              }
            );
            processBlockError.finish();
          }

          processBlockSpan.finish();

          StateHelper.setState(state); // important
        } catch (err) {
          span.finish();

          span.setTag('error', true);
          span.log({
            value: `Failed to process confirmed block: ${err}`,
          });

          global.app.logger.error('Failed to process confirmed block:');
          global.app.logger.error(err);
        }

        return;
      } else {
        span.log({
          value: 'has not enough votes',
          receivedVotes: (votes && votes.signatures.length) || 0,
          pendingVotes: (totalVotes && totalVotes.signatures.length) || 0,
        });
        span.finish();

        StateHelper.setState(state); // important

        await pImmediate();
        return;
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
      delegateList: string[],
      span: ISpan
    ) => Promise<IStateSuccess>,
    getBlocksByHeight: GetBlocksByHeight
  ) => {
    let state = StateHelper.copyState(old);

    if (new BigNumber(0).isEqualTo(numberOfBlocksInDb)) {
      state = BlocksHelper.setPreGenesisBlock(state);

      const span = global.library.tracer.startSpan('process block (genesis)');
      span.setTag('hash', getSmallBlockHash(genesisBlock));
      span.setTag('height', genesisBlock.height);
      span.setTag('id', genesisBlock.id);

      const options: ProcessBlockOptions = {};
      const delegateList: string[] = [];
      const stateResult = await processBlock(
        state,
        genesisBlock,
        options,
        delegateList,
        span
      );

      span.finish();
      state = stateResult.state;

      if (!stateResult.success) {
        const processBlockError = global.library.tracer.startSpan(
          'processBlock error',
          {
            childOf: span.context(),
          }
        );
        processBlockError.finish();
      }
    } else {
      const block = await getBlocksByHeight(
        new BigNumber(numberOfBlocksInDb).minus(1).toFixed()
      );
      state = BlocksHelper.SetLastBlock(state, block);
    }
    return state;
  };

  // Events
  public static onBind = async () => {
    // this.loaded = true; // TODO: use stateK

    await global.app.mutex.runExclusive(async () => {
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

        if (global.Config.nodeAction === 'forging') {
          return global.library.bus.message('onBlockchainReady');
        }

        if (
          typeof global.Config.nodeAction == 'string' &&
          global.Config.nodeAction.startsWith('rollback')
        ) {
          return global.library.bus.message('onBlockchainRollback');
        }

        if (
          typeof global.Config.nodeAction == 'string' &&
          global.Config.nodeAction.startsWith('stopWithHeight')
        ) {
          const stopHeight = global.Config.nodeAction.split(':')[1];
          const lastHeight = state.lastBlock.height;
          global.library.logger.info(
            `[stopWithHeight] stopWithHeight: lastHeight: "${lastHeight}" is bigger than "${stopHeight}"`
          );

          if (new BigNumber(lastHeight).isGreaterThanOrEqualTo(stopHeight)) {
            const span = global.library.tracer.startSpan('stop with height');
            span.log({
              stopHeight,
              lastHeight,
            });
            span.finish();

            global.library.logger.error(
              `[stopWithHeight] stopWithHeight: lastHeight: "${lastHeight}" is bigger than "${stopHeight}"`
            );

            return global.process.emit('cleanup');
          } else {
            return global.library.bus.message('onBlockchainReady');
          }
        }

        return;
      } catch (err) {
        const span = global.app.tracer.startSpan('onBind');
        span.setTag('error', true);
        span.log({
          value: `Failed to prepare local blockchain ${err}`,
        });
        span.finish();

        global.app.logger.error('Failed to prepare local blockchain');
        global.app.logger.error(err);
        throw new Error('Failed to prepare local blockchain');
      }
    });
  };

  public static shutDownInXSeconds = async () => {
    // we need to wait a few seconds after processBlock before shutting down
    // for other peers to have time to request the new block
    global.library.logger.info(`[stopWithHeight] setInterval [start]...`);

    await sleep(3 * 1000);

    await global.app.mutex.runExclusive(async () => {
      global.library.logger.info(
        `[stopWithHeight] setInterval add sequence [start]`
      );

      global.library.logger.info(`[stopWithHeight] sequence now running...`);

      process.exit(1);
    });
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
