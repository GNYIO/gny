import * as tracer from 'tracer';
import {
  IScope,
  IConfig,
  ITracer,
  BlockAndVotes,
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
import BalanceManager from './smartdb/balance-manager.js';
import LRU from 'lru-cache';
import * as Prom from 'prom-client';
import { Mutex } from 'async-mutex';

export interface IProm {
  peers: Prom.Gauge<string>;
  current_block_height: Prom.Gauge<string>;
  syncing: Prom.Gauge<string>;
  http_access_total: Prom.Counter<string>;
  accounts: Prom.Gauge<string>;
  blocks: Prom.Gauge<string>;
  transactions: Prom.Gauge<string>;
  requests: Prom.Counter<string>;
}

export interface IStateSuccess {
  success: boolean;
  state: IState;
}

export interface IState {
  votesKeySet: ISimpleCache<boolean>;
  pendingBlock: IBlock;
  pendingVotes: ManyVotes;

  lastBlock: IBlock;

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
  description: (value: string) => string;
}

export type ValidateFuncs = (
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
  tracer: ITracer;
}

export interface IApp {
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
  tracer: ITracer;
  prom: IProm;
  mutex: Mutex;
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
    }
    interface Process {
      once(event: 'cleanup', listener: () => void): this;
      emit(event: 'cleanup'): this;
    }
  }
}
