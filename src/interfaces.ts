import server from './core/server';
import accounts from './core/accounts';
import transactions from './core/transactions';
import loader from './core/loader';
import peer from './core/peer';
import transport from './core/transport';
import delegates from './core/delegates';
import round from './core/round';
import uia from './core/uia';
import blocks from './core/blocks';

import { Consensus as BaseConsensus } from './base/consensus';
import { Transaction as BaseTransaction } from './base/transaction';
import { Block as BaseBlock } from './base/block';

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

declare interface IBase {
  bus: any;
  genesisBlock: IGenesisBlock;
  consensus: BaseConsensus;
  transaction: BaseTransaction;
  block: BaseBlock;
}

export interface IScope {
  protobuf: Protobuf;
  config: IConfig;
  logger: ILogger;
  genesisBlock: IGenesisBlock;
  joi: ExtendedJoi;
  network: INetwork;
  dbSequence: Sequence;
  sequence: Sequence;
  base: IBase;
  bus: EventEmitter & IMessageEmitter;
  modules: Modules;
  coreApi: any;
}

export interface Modules {
  server: server;
  accounts: accounts;
  transactions: transactions;
  loader: loader;
  peer: peer;
  transport: transport;
  delegates: delegates;
  round: round;
  uia: uia;
  blocks: blocks;
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
  address: string;
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
    list: { ip: string; port: string | number }[];
  };
  logLevel: ILogLevel;
  pidFile: string;
  publicIp?: string;
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

export interface ISimpleCache {
  [id: string]: boolean;
}

export type Next = (err?: string) => any;

export interface PeerNode {
  host: string;
  port: number;
}

export interface ProcessBlockOptions {
  syncing?: boolean;
  local?: true;
  broadcast?: true;
  votes?: ManyVotes;
}

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
  _version_: number;
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

declare global {
  namespace NodeJS {
    interface Global {
      library: Partial<IScope>;
      modules: Modules;
      app: Partial<IApp>;
      Config: Partial<IConfig>;
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
