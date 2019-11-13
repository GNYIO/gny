import * as tracer from 'tracer';
import { EventEmitter } from 'events';

// IServer import
import * as express from 'express';
import { Server } from 'http';
import * as SocketIO from 'socket.io';

declare interface IBase {
  bus: IMessageBus;
  genesisBlock: IBlock;
}

export interface IProtobuf {
  encodeBlockPropose(propose: BlockPropose): Buffer;
  decodeBlockPropose(data: Buffer): BlockPropose;
  encodeBlockVotes(obj: any): Buffer;
  decodeBlockVotes(data: Buffer);
  encodeUnconfirmedTransaction(trs: UnconfirmedTransaction): Buffer;
  decodeUnconfirmedTransaction(data: Buffer): UnconfirmedTransaction;
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
  genesisBlock: IBlock;
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

export interface ICoreModule {
  cleanup?: (cb: any) => void;
}

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
  add(trs: UnconfirmedTransaction): void;
  remove(id: string): void;
  has(id: string): boolean;
  getUnconfirmed(): Array<UnconfirmedTransaction>;
  clear(): void;
  get(id: string): UnconfirmedTransaction;
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
    privateP2PKey: string;
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

export interface AccountWeightViewModel extends IAccount {
  balance: string;
  weightRatio: string;
}

export interface UnconfirmedTransaction {
  // ITransaction without "height"
  id: string;
  type: number;
  timestamp: number;
  senderId: string;
  senderPublicKey: string;
  fee: string;
  signatures?: any;
  secondSignature?: any;
  args: any;
  message?: string;
  _version_?: number;
}

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
  approval: string;
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
  trs: UnconfirmedTransaction;
  block: Pick<IBlock, 'height'>;
  sender: IAccount;
}

export interface ApiError<T> {
  success: false;
  error: T | string;
}

export interface ApiSuccess {
  success: true;
}

export type ApiResult<K, T = string> = (K & ApiSuccess) | ApiError<T>;

export type OffsetAndLimitError =
  | 'child "offset" fails because ["offset" must be a number]'
  | 'child "limit" fails because ["limit" must be a number]'
  | 'child "offset" fails because ["offset" must be larger than or equal to 0]'
  | 'child "limit" fails because ["limit" must be less than or equal to 100]';

export type ValidationError =
  | 'child "address" fails because ["address" is not a GNY address]'
  | 'child "publicKey" fails because ["publicKey" is not in the format of a 32 char long hex string buffer]'
  | 'child "secret" fails because ["secret" is not BIP39 complient]'
  | 'child "username" fails because ["username" is not an GNY username]'
  | 'child "issuer" fails because ["address" is not a valid GNY issuer name]'
  | 'child "asset" fails because ["asset" is not a valid GNY asset name]'
  | 'child "signature" fails because ["signature" is not a valid GNY signature]'
  | 'child "positiveOrZeroBigInt" fails because ["positiveOrZeroBigInt" is not a positive or zero big integer amount]'
  | 'child "ipv4PlusPort" fails because ["ipv4PlusPort" is not a ipv4:port]'
  | 'Invalid params';

export type AccountGenerateModel = {
  secret: string;
  publicKey: string;
  privateKey: string;
  address: string;
};

export type ServerError = 'Server Error';

export type GetAccountError =
  | 'provided address is not a GNY address'
  | ServerError;

export interface AccountOpenModel {
  account: AccountViewModel;
  latestBlock: {
    height: string;
    timestamp: number;
  };
  version: {
    version: string;
    build: string;
    net: string;
  };
}

export interface BalancesModel {
  count: number;
  balances: IBalance[];
}

export interface IBalanceWrapper {
  balance: IBalance;
}

export interface DelegatesWrapper {
  delegates: DelegateViewModel[];
}

export type DelegateError = 'Account not found' | ServerError;

export interface CountWrapper {
  count: number;
}

export interface PulicKeyWapper {
  publicKey: string;
}

export interface BlockWrapper {
  block: IBlock;
}

export type BlockError = 'Block not found';

export interface BlocksModel {
  count: number;
  blocks: IBlock[];
}

export interface HeightWrapper {
  height: string;
}

export interface MilestoneWrapper {
  milestone: number;
}

export interface RewardWrappper {
  reward: number;
}

export interface SupplyWrapper {
  supply: string;
}

export interface Status {
  height: string;
  fee: string;
  milestone: number;
  reward: number;
  supply: string;
}

export interface AccountsWrapper {
  accounts: AccountWeightViewModel[];
}

export interface DelegateWrapper {
  delegate: DelegateViewModel;
}

export interface DelegatesWrapper {
  tatolCount: number;
  delegates: DelegateViewModel[];
}

export interface ForgingStatus {
  enabled: boolean;
}

export interface LoaderStatus {
  loaded: boolean;
}

export interface SyncStatus {
  syncing: boolean;
  blocks: number;
  height: string;
}

export interface PeersWrapper {
  peers: SimplePeerInfo[];
  count: number;
}

export interface VersionWrapper {
  version: string;
  build: string;
  net: string;
}

export interface SystemInfo {
  os: string;
  version: string;
  timestamp: number;
  lastBlock: {
    height: string;
    timestamp: number;
    behind: number;
  };
}

export interface UnconfirmedTransactionWrapper {
  transaction: UnconfirmedTransaction;
}

export interface TransactionsWrapper {
  count: number;
  transactions: Array<UnconfirmedTransaction | ITransaction>;
}

export interface TransactionIdWapper {
  transactionId: string;
}
// Client

export type ResponseError =
  | GetAccountError
  | ValidationError
  | OffsetAndLimitError;

export type BalanceResponseError = 'No balance';

export type DelegateResponseError =
  | 'Failed to count delegates'
  | 'no delegates'
  | 'Can not find delegate'
  | 'No delegates found'
  | 'Delegate not found';

export type ForgingError =
  | 'Access denied'
  | 'Invalid passphrase'
  | 'Forging is already enabled'
  | 'Delegate not found';

export type TransactionError =
  | 'Transaction not found'
  | 'Invalid transaction body: is not a valid transaction'
  | 'Invalid transaction body';
