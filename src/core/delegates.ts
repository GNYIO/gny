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
  IState,
  BlockSlotData,
  IBlock,
} from '../interfaces';
import { RoundBase } from '../base/round';
import { BlocksCorrect } from './blocks-correct';
import { copyObject } from '../base/helpers';

export default class Delegates {
  private loaded: boolean = false;
  private keyPairs: KeyPairsIndexer = {};
  private isForgingEnabled = true;
  private readonly library: IScope;
  private modules: Modules;

  private readonly BOOK_KEEPER_NAME = 'round_bookkeeper';
  private blockreward = new BlockReward();

  constructor(scope: IScope) {
    this.library = scope;
  }

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope;
  };

  public onBlockchainReady = async () => {
    this.loaded = true;

    const error = await this.loadMyDelegates();
    if (error) {
      this.library.logger.error('Failed to load delegates', error);
    }

    const nextLoop = async () => {
      await this.loop(); // const result =
      setTimeout(nextLoop, 100);
    };

    setImmediate(nextLoop);
  };

  public isPublicKeyInKeyPairs = (publicKey: string) => {
    if (this.keyPairs[publicKey]) {
      return true;
    } else {
      return false;
    }
  };

  public setKeyPair = (publicKey: string, keys: KeyPair) => {
    this.keyPairs[publicKey] = keys;
  };
  public removeKeyPair = (publicKey: string) => {
    delete this.keyPairs[publicKey];
  };

  public getBlockSlotData = (
    slot: number,
    activeDelegates: string[]
  ): void | BlockSlotData => {
    if (!activeDelegates || !activeDelegates.length) {
      return;
    }
    const lastSlot = slots.getLastSlot(slot);

    for (let currentSlot = slot; currentSlot < lastSlot; currentSlot += 1) {
      const delegatePos = currentSlot % slots.delegates;

      const delegateKey = activeDelegates[delegatePos];

      if (delegateKey && this.keyPairs[delegateKey]) {
        return {
          time: slots.getSlotTime(currentSlot),
          keypair: this.keyPairs[delegateKey],
        };
      }
    }
  };

  public loop = async () => {
    if (!this.isForgingEnabled) {
      this.library.logger.trace('Loop:', 'forging disabled');
      return;
    }
    if (!Object.keys(this.keyPairs).length) {
      this.library.logger.trace('Loop:', 'no delegates');
      return;
    }

    if (!this.loaded || this.modules.loader.syncing()) {
      this.library.logger.trace('Loop:', 'node not ready');
      return;
    }

    const currentSlot = slots.getSlotNumber();
    const lastBlock = BlocksCorrect.getState().lastBlock;
    const lastBlockSlotNumber = slots.getSlotNumber(lastBlock.timestamp);

    if (currentSlot === lastBlockSlotNumber) {
      return;
    }

    if (Date.now() % 10000 > 5000) {
      this.library.logger.trace('Loop:', 'maybe too late to collect votes');
      return;
    }

    const delList = await this.generateDelegateList(
      Number(lastBlock.height) + 1
    );
    const currentBlockData = this.getBlockSlotData(currentSlot, delList);
    if (!currentBlockData) {
      this.library.logger.trace('Loop:', 'skipping slot');
      return;
    }

    this.library.sequence.add(async done => {
      try {
        const myTime = currentBlockData.time;
        const isCurrentSlot =
          slots.getSlotNumber(myTime) === slots.getSlotNumber();
        const lastBlockWasBefore =
          BlocksCorrect.getState().lastBlock.timestamp < myTime;
        const noPendingBlock =
          this.library.modules.consensusManagement.hasPendingBlock(myTime) ===
          false;

        if (isCurrentSlot && lastBlockWasBefore && noPendingBlock) {
          const old = BlocksCorrect.getState();
          let state = copyObject(old) as IState;

          const height = state.lastBlock.height + 1;

          const activeDelegates = await this.getActiveDelegateKeypairs(height); // move to BlocksCorrect?
          const unconfirmedTransactions = this.modules.transactions.getUnconfirmedTransactionList();
          const delegateList = await this.generateDelegateList(height);

          const {
            block: newBlock,
            state: newState,
            votes: localVotes,
          } = await this.modules.blocks.generateBlock(
            state,
            activeDelegates,
            unconfirmedTransactions,
            currentBlockData.keypair,
            myTime,
            delegateList
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
          BlocksCorrect.setState(state);
        }
      } catch (e) {
        this.library.logger.error('Failed generate block within slot:', e);
        return;
      } finally {
        return done();
      }
    });
  };

  private loadMyDelegates = async () => {
    let secrets: string[] = [];
    if (this.library.config.forging.secret) {
      secrets = Array.isArray(this.library.config.forging.secret)
        ? this.library.config.forging.secret
        : [this.library.config.forging.secret];
    }

    try {
      const delegates = (await global.app.sdb.getAll('Delegate')) as Delegate[];
      if (!delegates || !delegates.length) {
        return 'Delegates not found in database';
      }
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
          this.keyPairs[publicKey] = keypair;
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
      return e;
    }
  };

  public getActiveDelegateKeypairs = async (height: number) => {
    const delegates = await this.generateDelegateList(height);
    if (!delegates) {
      return;
    }

    const results: KeyPair[] = [];
    for (const key in this.keyPairs) {
      if (delegates.indexOf(key) !== -1) {
        results.push(this.keyPairs[key]);
      }
    }
    return results;
  };

  public validateProposeSlot = async (propose: BlockPropose) => {
    const activeDelegates = await this.generateDelegateList(propose.height);
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

  public fork = (block, cause) => {
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

    const lastBlock = this.modules.blocks.getLastBlock();
    const totalSupply = this.blockreward.calculateSupply(lastBlock.height);

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

  public enableForging = () => {
    this.isForgingEnabled = true;
  };

  public disableForging = () => {
    this.isForgingEnabled = false;
  };

  private compare = (left: Delegate, right: Delegate) => {
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

  private getTopDelegates = async () => {
    const allDelegates = (await global.app.sdb.getAll(
      'Delegate'
    )) as Delegate[];
    const sortedPublicKeys = allDelegates
      .sort(this.compare)
      .map(d => d.publicKey)
      .slice(0, 101);
    return sortedPublicKeys;
  };

  private getBookkeeper = async (): Promise<string[]> => {
    const item = await global.app.sdb.get('Variable', {
      key: this.BOOK_KEEPER_NAME,
    });
    if (!item) {
      throw new Error('Bookkeeper variable not found');
    }

    // TODO: ?? make field type as JSON
    return JSON.parse(item.value);
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
