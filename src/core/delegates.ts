import * as crypto from 'crypto';
import * as ed from '../utils/ed';
import slots from '../utils/slots';
import BlockReward from '../utils/block-reward';
import {
  Modules,
  IScope,
  KeyPairsIndexer,
  KeyPair,
  Delegate,
  DelegateViewModel,
  BlockPropose,
  ProcessBlockOptions,
  BlockSlotData,
  IBlock,
  IState,
} from '../interfaces';
import { RoundBase } from '../base/round';
import { BlocksHelper } from './BlocksHelper';
import { ConsensusHelper } from './ConsensusHelper';
import { StateHelper } from './StateHelper';

const blockreward = new BlockReward();

export default class Delegates {
  private loaded: boolean = false;
  private readonly library: IScope;
  private modules: Modules;

  private readonly BOOK_KEEPER_NAME = 'round_bookkeeper';

  constructor(scope: IScope) {
    this.library = scope;
  }

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope;
  };

  public onBlockchainReady = async () => {
    this.loaded = true;

    const secrets = global.Config.forging.secret;
    const delegates: Delegate[] = await global.app.sdb.getAll('Delegate');
    const keyPairs = this.loadMyDelegates(secrets, delegates);
    StateHelper.SetKeyPairs(keyPairs);

    const nextLoop = async () => {
      await this.loop();
      setTimeout(nextLoop, 100);
    };

    setImmediate(nextLoop);
  };

  public getBlockSlotData = (
    slot: number,
    activeDelegates: string[],
    keyPairs: KeyPairsIndexer
  ): void | BlockSlotData => {
    if (!activeDelegates || !activeDelegates.length) {
      return;
    }
    const lastSlot = slots.getLastSlot(slot);

    for (let currentSlot = slot; currentSlot < lastSlot; currentSlot += 1) {
      const delegatePos = currentSlot % slots.delegates;

      const delegateKey = activeDelegates[delegatePos];

      if (delegateKey && keyPairs[delegateKey]) {
        return {
          time: slots.getSlotTime(currentSlot),
          keypair: keyPairs[delegateKey],
        };
      }
    }
  };

  public isLoopReady(
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

  public loop = async () => {
    const preState = BlocksHelper.getState();
    const now = Date.now();
    const isForgingEnabled = StateHelper.IsForgingEnabled();
    const isLoaded = this.loaded;
    const isSyncingRightNow = this.modules.loader.syncing();
    const keyPairs = StateHelper.GetKeyPairs();

    const error = this.isLoopReady(
      preState,
      now,
      isForgingEnabled,
      isLoaded,
      isSyncingRightNow,
      keyPairs
    );
    if (error) {
      this.library.logger.trace(error);
      return;
    }

    const delList = await this.generateDelegateList(
      Number(preState.lastBlock.height) + 1
    );
    const currentSlot = slots.getSlotNumber(slots.getEpochTime(now)); // or simply slots.getSlotNumber()
    const currentBlockData = this.getBlockSlotData(
      currentSlot,
      delList,
      keyPairs
    );
    if (!currentBlockData) {
      this.library.logger.trace('Loop: skipping slot');
      return;
    }

    this.library.sequence.add(async done => {
      let state = BlocksHelper.getState();

      try {
        const myTime = currentBlockData.time;
        const isCurrentSlot =
          slots.getSlotNumber(myTime) === slots.getSlotNumber();
        const lastBlockWasBefore = state.lastBlock.timestamp < myTime;
        const noPendingBlock =
          ConsensusHelper.hasPendingBlock(state, myTime) === false;

        if (isCurrentSlot && lastBlockWasBefore && noPendingBlock) {
          const height = state.lastBlock.height + 1;

          const unconfirmedTransactions = this.modules.transactions.getUnconfirmedTransactionList();
          const delegateList = await this.generateDelegateList(height);
          const activeDelegates = this.getActiveDelegateKeypairs(delegateList);

          const {
            block: newBlock,
            state: newState,
            votes: localVotes,
          } = await this.modules.blocks.generateBlock(
            state,
            activeDelegates,
            unconfirmedTransactions,
            currentBlockData.keypair,
            myTime
          );
          state = newState;

          // no pending block -> block can be created
          if (newBlock && !newState.pendingBlock && localVotes) {
            this.modules.transactions.clearUnconfirmed(); // TODO, handle better
            const options: ProcessBlockOptions = {
              local: true,
              broadcast: true,
              votes: localVotes,
            };
            state = await this.modules.blocks.processBlock(
              newState,
              newBlock,
              options,
              delegateList
            );
          }

          // set new state after successful finished
          BlocksHelper.setState(state);
        }
      } catch (e) {
        this.library.logger.error('Failed generate block within slot:', e);
        return;
      } finally {
        return done();
      }
    });
  };

  public loadMyDelegates = (secrets: string[], delegates: Delegate[]) => {
    const keyPairs: KeyPairsIndexer = {};

    if (!secrets || !secrets.length) {
      return keyPairs;
    }
    if (!delegates || !delegates.length) {
      return keyPairs;
    }

    try {
      const delegateMap = new Map<string, Delegate>();
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
          this.library.logger.info(
            `Forging enabled on account: ${delegateMap.get(publicKey).address}`
          );
        } else {
          this.library.logger.info(
            `Delegate with this public key not found: ${keypair.publicKey.toString(
              'hex'
            )}`
          );
        }
      }
    } catch (e) {
      this.library.logger.error(e);
    }

    return keyPairs;
  };

  public getActiveDelegateKeypairs = (delegates: string[]) => {
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

  public validateProposeSlot = (
    propose: BlockPropose,
    activeDelegates: string[]
  ) => {
    const currentSlot = slots.getSlotNumber(propose.timestamp);
    const delegateKey = activeDelegates[currentSlot % slots.delegates];

    if (delegateKey && propose.generatorPublicKey === delegateKey) {
      return;
    }

    throw new Error('Failed to validate propose slot');
  };

  public generateDelegateList = async (height: number): Promise<string[]> => {
    try {
      const truncDelegateList = await this.getBookkeeper();
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

  public validateBlockSlot = (block: IBlock, activeDelegates: string[]) => {
    const currentSlot = slots.getSlotNumber(block.timestamp);
    const delegateKey = activeDelegates[currentSlot % slots.delegates];

    if (delegateKey && block.delegate === delegateKey) {
      return;
    }

    throw new Error(`Failed to verify slot, expected delegate: ${delegateKey}`);
  };

  public getDelegates = async () => {
    const allDelegates = await global.app.sdb.getAll('Delegate');
    let delegates = allDelegates.map(d => Object.assign({}, d)) as Delegate[];
    if (!delegates || !delegates.length) {
      global.app.logger.info('no delgates');
      return undefined;
    }

    delegates = delegates.sort(this.compare);

    const lastBlock = BlocksHelper.getState().lastBlock;
    const totalSupply = blockreward.calculateSupply(lastBlock.height);

    for (let i = 0; i < delegates.length; ++i) {
      const current = delegates[i] as DelegateViewModel;
      current.rate = i + 1;
      current.approval = (current.votes / totalSupply) * 100;

      let percent =
        100 -
        current.missedBlocks /
          (current.producedBlocks + current.missedBlocks) /
          100;
      percent = percent || 0;
      current.productivity = parseFloat(
        Math.floor(percent * 100) / 100
      ).toFixed(2);
      await global.app.sdb.update('Delegate', current, {
        address: current.address,
      });
    }
    return delegates as DelegateViewModel[];
  };

  public compare = (left: Delegate, right: Delegate) => {
    if (left.votes !== right.votes) {
      return right.votes - left.votes;
    }
    return left.publicKey < right.publicKey ? 1 : -1;
  };

  public cleanup = cb => {
    this.library.logger.debug('Cleaning up core/delegates');
    this.loaded = false;
    cb();
  };

  public getTopDelegates = async () => {
    const allDelegates = (await global.app.sdb.getAll(
      'Delegate'
    )) as Delegate[];
    const sortedPublicKeys = allDelegates
      .sort(this.compare)
      .map(d => d.publicKey)
      .slice(0, 101);
    return sortedPublicKeys;
  };

  private getBookkeeper = async () => {
    const item = await global.app.sdb.get('Variable', {
      key: this.BOOK_KEEPER_NAME,
    });
    if (!item) {
      throw new Error('Bookkeeper variable not found');
    }

    // TODO: ?? make field type as JSON
    return JSON.parse(item.value) as string[];
  };

  public updateBookkeeper = async () => {
    const value = JSON.stringify(await this.getTopDelegates());
    const { create } = await global.app.sdb.createOrLoad('Variable', {
      key: this.BOOK_KEEPER_NAME,
      value: value,
    });
    // It seems there is no need to update
    if (!create) {
      await global.app.sdb.update(
        'Variable',
        { value },
        { key: this.BOOK_KEEPER_NAME }
      );
    }
  };
}
