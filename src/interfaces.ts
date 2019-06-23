import transactions from './core/transactions';
import loader from './core/loader';
import peer from './core/peer';
import transport from './core/transport';
import delegates from './core/delegates';
import blocks from './core/blocks';

import { Protobuf } from './utils/protobuf';
import * as tracer from 'tracer';

import Sequence from './utils/sequence';
import { EventEmitter } from 'events';

// IServer import
import * as express from 'express';
import { Server } from 'http';
import * as SocketIO from 'socket.io';

// IApp
import { SmartDB } from '../packages/database-postgres/src/smartDB';
import BalanceManager from './smartdb/balance-manager';

import { ExtendedJoi } from './utils/extendedJoi';
import { BigNumber } from 'bignumber.js';
import address from './utils/address';

import BlocksApi from '../packages/http/api/blocksApi';
import AccountsApi from '../packages/http/api/accountsApi';
import DelegatesApi from '../packages/http/api/delegatesApi';
import PeerApi from '../packages/http/api/peerApi';
import SystemApi from '../packages/http/api/systemApi';
import TransactionsApi from '../packages/http/api/transactionsApi';
import TransportApi from '../packages/http/api/transportApi';
import UiaApi from '../packages/http/api/uiaApi';
import LoaderApi from '../packages/http/api/loaderApi';
import TransfersApi from '../packages/http/api/transfersApi';
import { MessageBus } from './utils/messageBus';
import { TransactionPool } from './utils/transaction-pool';
import { LimitCache } from './utils/limit-cache';
import LRU = require('lru-cache');

export interface IState {
  votesKeySet: Set<any>;
  pendingBlock: IBlock;
  pendingVotes: ManyVotes;

  lastBlock: IBlock;
  blockCache: ISimpleCache<boolean>;

  proposeCache: ISimpleCache<boolean>;
  lastPropose: BlockPropose;
  privIsCollectingVotes: boolean;
  lastVoteTime: number;
}

declare interface IBase {
  bus: MessageBus;
  genesisBlock: IGenesisBlock;
}

export interface IScope {
  protobuf: Protobuf;
  config: IConfig;
  logger: ILogger;
  genesisBlock: IGenesisBlock;
  joi: ExtendedJoi;
  network: INetwork;
  sequence: Sequence;
  base: IBase;
  bus: MessageBus;
  modules: Modules;
  coreApi: CoreApi;
}

export interface Modules {
  transactions: transactions;
  loader: loader;
  peer: peer;
  transport: transport;
  delegates: delegates;
  blocks: blocks;
}

export interface CoreApi {
  blocksApi: BlocksApi;
  accountsApi: AccountsApi;
  delgatesApi: DelegatesApi;
  peerApi: PeerApi;
  systemApi: SystemApi;
  transactionsApi: TransactionsApi;
  transportApi: TransportApi;
  uiaApi: UiaApi;
  transfersApi: TransfersApi;
  loaderApi: LoaderApi;
}

export interface IMessageEmitter {
  message: (topic: string, ...restArgs: any[]) => void;
}

export interface INetwork {
  express: typeof express;
  app: express.Application;
  server: Server;
  io: SocketIO.Server;
  sslServer?: Server;
  sslio?: SocketIO.Server;
}

interface IUtil {
  address: typeof address;
  bignumber: typeof BigNumber;
}

interface IValidatorConstraints {
  length?: number;
  isEmail?: boolean;
  url?: boolean;
  number?: boolean;
}

interface IValidators {
  amount: (amount: string) => string;
  name: (amount: string) => string;
  publickey: (value: string) => string;
  string: (value: any, constraints: IValidatorConstraints) => any;
}

type ICurrency = string;
type IFee = string;

interface ICurrencyFee {
  currency: ICurrency;
  min: IFee;
}

interface IApp {
  sdb: SmartDB;
  balances: BalanceManager;
  events: EventEmitter;
  util: IUtil;
  validators: IValidators;
  validate: (
    type: string,
    value: any,
    constraints?: IValidatorConstraints
  ) => void | never;
  registerContract: (type: number, name: string) => void;
  getContractName: (type: string) => any;
  contractTypeMapping: {
    [type: string]: string;
  };
  contract: {
    [name: string]: any;
  };
  registerFee: (type: number, min: string, currency: string) => void;
  defaultFee: ICurrencyFee;
  feeMapping: {
    [type: string]: ICurrencyFee;
  };
  getFee: (type: string) => ICurrencyFee;
  setDefaultFee: (min: string, currency: string) => void;
  addRoundFee: (fee: IFee, roundNumber: number) => void;
  hooks: {
    [name: string]: () => void;
  };
  registerHook: (name: string, func: () => void) => void;
  logger: ILogger;
}

export type ILogger = tracer.Tracer.Logger;

export interface IGenesisBlock {
  version: number;
  payloadHash: string;
  timestamp: number;
  previousBlock: null;
  delegate: string;
  height: number;
  count: number;
  fees: number;
  reward: number;
  signature: string;
  id: string;
  transactions: {
    type: number;
    fee: number;
    timestamp: number;
    senderId: string;
    senderPublicKey: string;
    signatures: string[];
    message: string;
    args: any[];
    id: string;
  }[];
}

type ILogLevel =
  | 'trace'
  | 'debug'
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

export interface IConfig {
  version: string;
  magic: string;
  baseDir: string;
  dataDir: string;
  appDir: string;
  buildVersion: string;
  netVersion: string;
  publicDir: string;
  port: number;
  peerPort: number;
  address: string;
  peers: {
    bootstrap: string | null;
    p2pKeyFile: string;
    rawPeerInfo: string;
    options: {
      timeout: number;
    };
  };
  forging: {
    secret: string[];
    access: {
      whiteList: string[];
    };
  };
  logLevel: ILogLevel;
  pidFile: string;
  publicIp?: string;
  ormConfigRaw: string;
  ssl: {
    enabled: boolean;
    options: {
      port: number;
      address: string;
      key: string;
      cert: string;
    };
  };
}

export interface KeyPairsIndexer {
  [publicKey: string]: KeyPair;
}

export interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
}

export interface ManyVotes {
  height: number;
  id: string;
  signatures: Signature[];
}

export interface Signature {
  publicKey: string;
  signature: string;
}

export interface ISimpleCache<VALUE_TYPE> {
  [id: string]: VALUE_TYPE;
}

export type Next = (err?: string) => any;

export interface PeerNode {
  host: string;
  port: number;
}

export interface ProcessBlockOptions {
  local?: true;
  broadcast?: true;
  votes?: ManyVotes;
}

export interface BlockSlotData {
  time: number;
  keypair: KeyPair;
}

export type BlockHeightId = Pick<IBlock, 'height' | 'id'>;

// Models
export interface IBlock {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  prevBlockId?: any;
  count: number;
  fees: number;
  reward: number;
  payloadHash: string;
  delegate: string;
  signature: string;
  _version_?: number;
  transactions?: any;
}

export interface Transaction {
  id: string;
  type: number;
  timestamp: number;
  senderId: string;
  senderPublicKey: string;
  fee: number;
  signatures?: any;
  secondSignature?: any;
  args: any;
  height: number;
  message?: string;
  _version_?: number;
}

export interface Transfer {
  tid: string;
  senderId: string;
  recipientId: string;
  recipientName?: string;
  currency: string;
  amount: number;
  timestamp: number;
  height: number;
  _version_: number;
}

export interface Delegate {
  address: string;
  tid: string;
  username: string;
  publicKey: string;
  votes: number;
  producedBlocks: number;
  missedBlocks: number;
  fees: number;
  rewards: number;
}

export interface DelegateViewModel extends Delegate {
  rate: number;
  approval: number;
  productivity: string;
}

export interface NewBlockMessage {
  id: string;
  height: number;
  prevBlockId: string;
}

export interface P2PMessage {
  data: Buffer;
  from: string;
  seqno: Buffer;
  topicIDs: string[];
  peerInfo: PeerNode;
}

export type P2PSubscribeHandler = (message: P2PMessage) => void;

export interface BlockPropose {
  address: string;
  generatorPublicKey: string;
  hash: string;
  height: number;
  id: string;
  signature: string;
  timestamp: number;
}

export interface BlockAndVotes {
  block: IBlock;
  votes: string;
}

export interface FirstHeightIds {
  ids: string[];
  firstHeight: number;
}

export interface CommonBlockParams {
  max: number;
  min: number;
  ids: string[];
}

export interface CommonBlockResult {
  success: boolean;
  common: IBlock;
}

export interface Context {
  trs: Transaction;
  block: Pick<IBlock, 'height'>;
  sender: any;
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
      transactionPool: TransactionPool;
      failedTrsCache: LimitCache<string, boolean>;
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

export interface IOptions {
  appConfig: IConfig;
  genesisBlock: IGenesisBlock;
  logger: ILogger;
  pidFile: string;
  modules?: any;
  library?: Partial<IScope>;
}
