import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import { slots, DELEGATES } from '@gny/utils';
import { BlockReward } from '@gny/utils';
import {
  KeyPairsIndexer,
  KeyPair,
  IDelegate,
  DelegateViewModel,
  BlockPropose,
  ProcessBlockOptions,
  BlockSlotData,
  IBlock,
  IVariable,
  ICoreModule,
} from '@gny/interfaces';
import { IState } from '../globalInterfaces';
import { RoundBase } from '@gny/base';
import { ConsensusHelper } from './ConsensusHelper';
import { StateHelper } from './StateHelper';
import Blocks from './blocks';
import BigNumber from 'bignumber.js';
import { Variable } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';

const blockReward = new BlockReward();

export default class Delegates implements ICoreModule {
  private static readonly BOOK_KEEPER_NAME = 'round_bookkeeper';

  // Events
  public static onBlockchainReady = async () => {
    // this.loaded = true;

    const secrets = global.Config.forging.secret;
    const delegates = await global.app.sdb.getAll<Delegate>(Delegate);
    const keyPairs = Delegates.loadMyDelegates(secrets, delegates);
    StateHelper.SetKeyPairs(keyPairs);

    const nextLoop = async () => {
      await Delegates.loop();
      setTimeout(nextLoop, 100);
    };

    setImmediate(nextLoop);
  };

  public static getBlockSlotData = (
    slot: number,
    activeDelegates: string[],
    keyPairs: KeyPairsIndexer
  ): void | BlockSlotData => {
    if (!activeDelegates || !activeDelegates.length) {
      return;
    }
    const lastSlot = slots.getLastSlot(slot);

    for (let currentSlot = slot; currentSlot < lastSlot; currentSlot += 1) {
      const delegatePos = currentSlot % DELEGATES;

      const delegateKey = activeDelegates[delegatePos];

      if (delegateKey && keyPairs[delegateKey]) {
        return {
          time: slots.getSlotTime(currentSlot),
          keypair: keyPairs[delegateKey],
        };
      }
    }
  };

  public static isLoopReady(
    state: IState,
    now: number,
    isForgingEnabled: boolean,
    isLoaded: boolean,
    isSyncingRightNow: boolean,
    keyPairs: KeyPairsIndexer
  ) {
    if (!isForgingEnabled) {
      return 'Loop: forging disabled';
    }

    if (!Object.keys(keyPairs).length) {
      return 'Loop: no delegates';
    }

    if (!isLoaded || isSyncingRightNow) {
      return 'Loop: node not ready';
    }

    const currentEpochTime = slots.getEpochTime(now);
    const currentSlot = slots.getSlotNumber(currentEpochTime);

    const lastBlock = state.lastBlock;
    const lastBlockSlotNumber = slots.getSlotNumber(lastBlock.timestamp);

    if (currentSlot === lastBlockSlotNumber) {
      return 'Loop: still in last Block slot';
    }

    if (now % 10000 > 5000) {
      return 'Loop: maybe too late to collect votes';
    }

    return undefined;
  }

  public static loop = async () => {
    const preState = StateHelper.getState();
    const now = Date.now();
    const isForgingEnabled = StateHelper.IsForgingEnabled();
    const isLoaded = StateHelper.BlockchainReady();
    const isSyncingRightNow = StateHelper.IsSyncing();
    const keyPairs = StateHelper.GetKeyPairs();

    const error = Delegates.isLoopReady(
      preState,
      now,
      isForgingEnabled,
      isLoaded,
      isSyncingRightNow,
      keyPairs
    );
    if (error) {
      global.library.logger.trace(error);
      return;
    }

    const delList = await Delegates.generateDelegateList(
      new BigNumber(preState.lastBlock.height).plus(1).toFixed()
    );
    const currentSlot = slots.getSlotNumber(slots.getEpochTime(now)); // or simply slots.getSlotNumber()
    const currentBlockData = Delegates.getBlockSlotData(
      currentSlot,
      delList,
      keyPairs
    );
    if (!currentBlockData) {
      global.library.logger.trace('Loop: skipping slot');
      return;
    }

    global.library.sequence.add(async done => {
      let state = StateHelper.getState();

      let error = false;

      try {
        const myTime = currentBlockData.time;
        const isCurrentSlot =
          slots.getSlotNumber(myTime) === slots.getSlotNumber();
        const lastBlockWasBefore = state.lastBlock.timestamp < myTime;
        const noPendingBlock =
          ConsensusHelper.hasPendingBlock(state, myTime) === false;

        if (isCurrentSlot && lastBlockWasBefore && noPendingBlock) {
          const height = new BigNumber(state.lastBlock.height)
            .plus(1)
            .toFixed();

          const unconfirmedTransactions = StateHelper.GetUnconfirmedTransactionList();
          const delegateList = await Delegates.generateDelegateList(height);
          const activeDelegates = Delegates.getActiveDelegateKeypairs(
            delegateList
          );

          const {
            block: newBlock,
            state: newState,
            votes: localVotes,
          } = await Blocks.generateBlock(
            state,
            activeDelegates,
            unconfirmedTransactions,
            currentBlockData.keypair,
            myTime
          );
          state = newState;

          // no pending block -> block can be created
          if (newBlock && !newState.pendingBlock && localVotes) {
            StateHelper.ClearUnconfirmedTransactions(); // TODO, handle better
            const options: ProcessBlockOptions = {
              local: true,
              broadcast: true,
              votes: localVotes,
            };
            const stateResult = await Blocks.processBlock(
              newState,
              newBlock,
              options,
              delegateList
            );
            state = stateResult.state;

            if (stateResult.success === false) {
              global.app.logger.warn(
                `newBlock(height: ${newBlock.height}), ${JSON.stringify(
                  newBlock,
                  null,
                  2
                )}`
              );
              error = true;
            }
          }

          // set new state after successful finished
          StateHelper.setState(state);
        }
      } catch (e) {
        global.library.logger.error('Failed generate block within slot:', e);
        return;
      } finally {
        if (error) {
          throw new Error('error occured during Blocks.processBlock()');
        }
        return done();
      }
    });
  };

  public static loadMyDelegates = (
    secrets: string[],
    delegates: IDelegate[]
  ) => {
    const keyPairs: KeyPairsIndexer = {};

    if (!secrets || !secrets.length) {
      return keyPairs;
    }
    if (!delegates || !delegates.length) {
      return keyPairs;
    }

    try {
      const delegateMap = new Map<string, IDelegate>();
      for (const d of delegates) {
        delegateMap.set(d.publicKey, d);
      }

      for (const secret of secrets) {
        const keypair = ed.generateKeyPair(
          crypto
            .createHash('sha256')
            .update(secret, 'utf8')
            .digest()
        );
        const publicKey = keypair.publicKey.toString('hex');
        if (delegateMap.has(publicKey)) {
          keyPairs[publicKey] = keypair;
          global.library.logger.info(
            `Forging enabled on account: ${delegateMap.get(publicKey).address}`
          );
        } else {
          global.library.logger.info(
            `Delegate with this public key not found: ${keypair.publicKey.toString(
              'hex'
            )}`
          );
        }
      }
    } catch (e) {
      global.library.logger.error(e);
    }

    return keyPairs;
  };

  public static getActiveDelegateKeypairs = (delegates: string[]) => {
    if (!delegates) {
      return [];
    }

    const results: KeyPair[] = [];
    const keyPairs = StateHelper.GetKeyPairs();
    for (const key in keyPairs) {
      if (delegates.indexOf(key) !== -1) {
        results.push(keyPairs[key]);
      }
    }
    return results;
  };

  public static validateProposeSlot = (
    propose: BlockPropose,
    activeDelegates: string[]
  ) => {
    const currentSlot = slots.getSlotNumber(propose.timestamp);
    const delegateKey = activeDelegates[currentSlot % DELEGATES];

    if (delegateKey && propose.generatorPublicKey === delegateKey) {
      return;
    }

    throw new Error('Failed to validate propose slot');
  };

  public static generateDelegateList = async (
    height: string
  ): Promise<string[]> => {
    try {
      const truncDelegateList = await Delegates.getBookkeeper();
      const seedSource = RoundBase.calculateRound(height).toString();

      let currentSeed = crypto
        .createHash('sha256')
        .update(seedSource, 'utf8')
        .digest();
      for (let i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
        for (let x = 0; x < 4 && i < delCount; i++, x++) {
          const newIndex = currentSeed[x] % delCount;
          const b = truncDelegateList[newIndex];
          truncDelegateList[newIndex] = truncDelegateList[i];
          truncDelegateList[i] = b;
        }
        currentSeed = crypto
          .createHash('sha256')
          .update(currentSeed)
          .digest();
      }

      return truncDelegateList;
    } catch (e) {
      global.app.logger.error('error while generating DelgateList', e);
      return;
    }
  };

  public static validateBlockSlot = (
    block: IBlock,
    activeDelegates: string[]
  ) => {
    const currentSlot = slots.getSlotNumber(block.timestamp);
    const delegateKey = activeDelegates[currentSlot % DELEGATES];

    if (delegateKey && block.delegate === delegateKey) {
      return;
    }

    throw new Error(`Failed to verify slot, expected delegate: ${delegateKey}`);
  };

  public static getDelegates = async () => {
    const allDelegates = await global.app.sdb.getAll<Delegate>(Delegate);
    let delegates = allDelegates.map(d => Object.assign({}, d)) as IDelegate[];
    if (!delegates || !delegates.length) {
      global.app.logger.info('no delgates');
      return undefined;
    }

    delegates = delegates.sort(Delegates.compare);

    const lastBlock = StateHelper.getState().lastBlock;
    const totalSupply = blockReward.calculateSupply(lastBlock.height);

    for (let i = 0; i < delegates.length; ++i) {
      const current = delegates[i] as DelegateViewModel;
      current.rate = i + 1;
      current.approval = new BigNumber(current.votes)
        .dividedBy(totalSupply)
        .times(100)
        .toFixed();

      let myBlocks = new BigNumber(current.producedBlocks).plus(
        current.missedBlocks
      );
      if (myBlocks.isEqualTo(0)) {
        myBlocks = new BigNumber(1);
      }

      const productivity = new BigNumber(current.producedBlocks)
        .dividedBy(myBlocks)
        .toFixed();
      current.productivity = productivity;
    }
    return delegates as DelegateViewModel[];
  };

  public static compare = (left: IDelegate, right: IDelegate) => {
    if (typeof left.votes !== 'string' || typeof right.votes !== 'string') {
      throw new Error('delegates votes must be strings');
    }
    if (left.votes !== right.votes) {
      return new BigNumber(right.votes).minus(left.votes).isGreaterThan(0)
        ? 1
        : -1;
    }
    return left.publicKey < right.publicKey ? 1 : -1;
  };

  public static getTopDelegates = async () => {
    const allDelegates = await global.app.sdb.getAll<Delegate>(Delegate);
    const sortedPublicKeys = allDelegates
      .sort(Delegates.compare)
      .map(d => d.publicKey)
      .slice(0, 101);
    return sortedPublicKeys;
  };

  private static getBookkeeper = async () => {
    const item = await global.app.sdb.get<Variable>(Variable, {
      key: Delegates.BOOK_KEEPER_NAME,
    });
    if (!item) {
      throw new Error('Bookkeeper variable not found');
    }

    // TODO: ?? make field type as JSON
    return JSON.parse(item.value) as string[];
  };

  public static updateBookkeeper = async () => {
    const value = JSON.stringify(await Delegates.getTopDelegates());
    const variable: IVariable = {
      key: Delegates.BOOK_KEEPER_NAME,
      value: value,
    };
    const { create } = await global.app.sdb.createOrLoad<Variable>(
      Variable,
      variable
    );
    // It seems there is no need to update
    if (!create) {
      await global.app.sdb.update<Variable>(
        Variable,
        { value },
        { key: Delegates.BOOK_KEEPER_NAME }
      );
    }
  };
}
