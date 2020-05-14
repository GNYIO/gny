import * as tracer from 'tracer';
import {
  IScope,
  IConfig,
  BlockAndVotes,
  NewBlockMessage,
  ILimitCache,
  ITransactionPool,
  IBlock,
  ManyVotes,
  BlockPropose,
  Modules,
  KeyPairsIndexer,
} from '@gny/interfaces';
import { SmartDB } from '@gny/database-postgres';
import { EventEmitter } from 'events';
import BalanceManager from './smartdb/balance-manager';
import * as LRU from 'lru-cache';

export interface IStateSuccess {
  success: boolean;
  state: IState;
}

export interface IState {
  votesKeySet: ISimpleCache<boolean>;
  pendingBlock: IBlock;
  pendingVotes: ManyVotes;

  lastBlock: IBlock;
  blockCache: ISimpleCache<boolean>;

  proposeCache: ISimpleCache<boolean>;
  lastPropose: BlockPropose;
  privIsCollectingVotes: boolean;
  lastVoteTime: number;
}

export interface ISimpleCache<VALUE_TYPE> {
  [id: string]: VALUE_TYPE;
}

interface IValidators {
  amount: (amount: string) => string;
  name: (amount: string) => string;
  publickey: (value: string) => string;
}

type ValidateFuncs = (
  type: string,
  value: any,
  constraints?: IValidatorConstraints
) => void | never;

interface IContractTypeMapping {
  [type: string]: string;
}

export interface IValidatorConstraints {
  length?: number;
  isEmail?: boolean;
  url?: boolean;
  number?: boolean;
}

// duplicate also in packages/interfaces
export type ILogger = tracer.Tracer.Logger;

export interface IOptions {
  appConfig: IConfig;
  genesisBlock: IBlock;
  logger: ILogger;
  pidFile: string;
  modules?: any;
  library?: Partial<IScope>;
}

interface IApp {
  sdb: SmartDB;
  balances: BalanceManager;
  events: EventEmitter;
  validators: IValidators;
  validate: ValidateFuncs;
  getContractName: (type: string) => any;
  contractTypeMapping: IContractTypeMapping;
  contract: {
    [name: string]: any;
  };
  logger: ILogger;
}

declare global {
  namespace NodeJS {
    interface Global {
      library: Partial<IScope>;
      modules: Modules;
      app: Partial<IApp>;
      Config: Partial<IConfig>;
      state: IState;
      keyPairs: KeyPairsIndexer;
      isForgingEnabled: boolean;
      privSyncing: boolean;
      blocksToSync: number;
      transactionPool: ITransactionPool;
      failedTrsCache: ILimitCache<string, boolean>;
      areAllModulesLoaded: boolean;
      blockchainReady: boolean;
      latestBlocksCache: LRU<string, BlockAndVotes>;
      blockHeaderMidCache: LRU<string, NewBlockMessage>;
    }
    interface Process {
      once(event: 'cleanup', listener: () => void): this;
      emit(event: 'cleanup'): this;
    }
  }
}
