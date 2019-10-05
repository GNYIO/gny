import * as tracer from 'tracer';
import { EventEmitter } from 'events';

// IServer import
import * as express from 'express';
import { Server } from 'http';
import * as SocketIO from 'socket.io';

declare interface IBase {
  bus: IMessageBus;
  genesisBlock: IGenesisBlock;
}

export interface IProtobuf {
  encodeBlockPropose(propose: BlockPropose): Buffer;
  decodeBlockPropose(data: Buffer): BlockPropose;
  encodeBlockVotes(obj: any): Buffer;
  decodeBlockVotes(data: Buffer);
  encodeTransaction(trs: ITransaction): Buffer;
  decodeTransaction(data: Buffer);
  encodeNewBlockMessage(msg): Buffer;
  decodeNewBlockMessage(data: Buffer): NewBlockMessage;
}

export interface ISequence {
  add(worker: any, args?: any, cb?: any): void;
  count(): number;
}

export interface ILimitCache<KEY, VAL> {
  set(key: KEY, value: VAL): void;
  has(key: KEY): boolean;
  getLimit(): number;
}

export interface IScope {
  protobuf: IProtobuf;
  config: IConfig;
  logger: ILogger;
  genesisBlock: IGenesisBlock;
  network: INetwork;
  sequence: ISequence;
  base: IBase;
  bus: IMessageBus;
  modules: Modules;
  coreApi: CoreApi;
}

export type MethodActions =
  | 'onBind'
  | 'onUnconfirmedTransaction'
  | 'onReceiveVotes'
  | 'onNewBlock'
  | 'onProcessBlock'
  | 'onBlockchainReady'
  | 'onPeerReady'
  | 'onNewPropose'
  | 'onReceiveBlock'
  | 'onReceivePropose'
  | 'onReceiveTransaction';

export interface ICoreModule {}

export interface Modules {
  [key: string]: ICoreModule;
  transactions: ICoreModule;
  loader: ICoreModule;
  peer: ICoreModule;
  transport: ICoreModule;
  delegates: ICoreModule;
  blocks: ICoreModule;
}

export interface IHttpApi {
  attachApi(): void;
}

export interface CoreApi {
  blocksApi: IHttpApi;
  accountsApi: IHttpApi;
  delgatesApi: IHttpApi;
  peerApi: IHttpApi;
  systemApi: IHttpApi;
  transactionsApi: IHttpApi;
  transportApi: IHttpApi;
  uiaApi: IHttpApi;
  transfersApi: IHttpApi;
  loaderApi: IHttpApi;
}

export interface ITransactionPool {
  add(trs: ITransaction): void;
  remove(id: string): void;
  has(id: string): boolean;
  getUnconfirmed(): ITransaction[];
  clear(): void;
  get(id: string): ITransaction;
}

interface IMessageEmitter {
  message: (topic: MethodActions, ...restArgs: any[]) => void;
}
export type IMessageBus = IMessageEmitter & EventEmitter;

export interface INetwork {
  express: typeof express;
  app: express.Application;
  server: Server;
  io: SocketIO.Server;
  sslServer?: Server;
  sslio?: SocketIO.Server;
}

export type ILogger = tracer.Tracer.Logger;

export interface IGenesisBlock {
  version: number;
  payloadHash: string;
  timestamp: number;
  prevBlockId: null;
  delegate: string;
  height: string;
  count: number;
  fees: string;
  reward: string;
  signature: string;
  id: string;
  transactions: ITransaction[];
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
  buildVersion: string;
  netVersion: string;
  publicDir: string;
  port: number;
  peerPort: number;
  address: string;
  peers: {
    bootstrap: string[];
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
  height: string;
  id: string;
  signatures: Signature[];
}

export interface Signature {
  publicKey: string;
  signature: string;
}

export type Next = (err?: string) => any;

export interface PeerNode {
  host: string;
  port: number;
}

export interface SimplePeerId {
  id: string;
  pubKey: string;
}
export interface SimplePeerInfo {
  multiaddrs: string[];
  id: SimplePeerId;
  simple: PeerNode;
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
  [index: string]: string | number | ITransaction[] | undefined;
  id: string;
  height: string;
  version: number;
  timestamp: number;
  prevBlockId?: any;
  count: number;
  fees: string;
  reward: string;
  payloadHash: string;
  delegate: string;
  signature: string;
  _version_?: number;
  transactions?: ITransaction[];
}

export interface IAccount {
  address: string;
  username?: string;
  gny: string;
  publicKey?: string;
  secondPublicKey?: string;
  isDelegate: number;
  isLocked: number;
  lockHeight: string;
  lockAmount: string;
  _version_?: number;
}

export type AccountViewModel = Pick<
  IAccount,
  | 'address'
  | 'publicKey'
  | 'secondPublicKey'
  | 'lockHeight'
  | 'isDelegate'
  | 'username'
> & { balance: string };

export interface ITransaction {
  id: string;
  type: number;
  timestamp: number;
  senderId: string;
  senderPublicKey: string;
  fee: string;
  signatures?: any;
  secondSignature?: any;
  args: any;
  height: string;
  message?: string;
  _version_?: number;
}

export interface ITransfer {
  tid: string;
  senderId: string;
  recipientId: string;
  recipientName?: string;
  currency: string;
  amount: string;
  timestamp: number;
  height: string;
  _version_?: number;
}

export interface IBalance {
  address: string;
  currency: string;
  balance: string;
  flag: number;
  asset?: IAsset;
  _version_?: number;
}

export interface IAsset {
  name: string;
  tid: string;
  timestamp: number;
  maximum: string;
  precision: number;
  quantity: string;
  desc: string;
  issuerId: string;
  _version_?: number;
}

export interface IDelegate {
  address: string;
  tid: string;
  username: string;
  publicKey: string;
  votes: string;
  producedBlocks: string;
  missedBlocks: string;
  fees: string;
  rewards: string;
  _version_?: number;
}

export interface DelegateViewModel extends IDelegate {
  rate: number;
  approval: number;
  productivity: string;
}

export interface IRound {
  round: string;
  fee: string;
  reward: string;
  _version_?: number;
}

export interface IIssuer {
  name: string;
  tid: string;
  issuerId: string;
  desc: string;
  _version_?: number;
}

export interface IVariable {
  key: string;
  value: string;
  _version_?: number;
}

export interface NewBlockMessage {
  id: string;
  height: string;
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
  height: string;
  id: string;
  signature: string;
  timestamp: number;
}

export interface BlockAndVotes {
  block: IBlock;
  votes: string;
}

export interface CommonBlockParams {
  max: string;
  min: string;
  ids: string[];
}

export interface CommonBlockResult {
  success: boolean;
  common: IBlock;
}

export interface Context {
  trs: ITransaction;
  block: Pick<IBlock, 'height'>;
  sender: IAccount;
}
