import * as tracer from 'tracer';
import * as jaegerClient from 'jaeger-client';
import { EventEmitter } from 'events';

// IServer import
import * as express from 'express';
import { Server } from 'http';
import * as SocketIO from 'socket.io';
import { SetRequired } from 'type-fest';

import BigNumber from 'bignumber.js';

declare interface IBase {
  bus: IMessageBus;
  genesisBlock: IBlock;
}

export interface IProtobuf {
  encodeBlockVotes(obj: any): Buffer;
  decodeBlockVotes(data: Buffer): ManyVotes;
  encodeUnconfirmedTransaction(trs: UnconfirmedTransaction): Buffer;
  decodeUnconfirmedTransaction(data: Buffer): UnconfirmedTransaction;
  encodeNewBlockMessage(msg: NewBlockMessage): Buffer;
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
  tracer: ITracer;
}

export type MethodActions =
  | 'onBind'
  | 'onUnconfirmedTransaction'
  | 'onReceiveVotes'
  | 'onNewBlock'
  | 'onProcessBlock'
  | 'onBlockchainReady'
  | 'onNewPropose'
  | 'onReceiveBlock'
  | 'onReceivePropose'
  | 'onReceiveTransaction'
  | 'onBlockchainRollback';

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
  exchangeApi: IHttpApi;
}

export interface ITransactionPool {
  add(trs: UnconfirmedTransaction): void;
  remove(id: string): void;
  has(id: string): boolean;
  getUnconfirmed(): Array<UnconfirmedTransaction | undefined>;
  clear(): void;
  get(id: string): UnconfirmedTransaction | undefined;
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

export type ITracer = jaegerClient.JaegerTracer;

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
  netVersion: NetworkType;
  port: number;
  peerPort: number;
  address: string;
  peers: {
    bootstrap: string[];
    privateP2PKey: string;
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
  ssl: {
    enabled: boolean;
    options: {
      port: number;
      address: string;
      key: string;
      cert: string;
    };
  };
  dbPassword: string;
  dbDatabase: string;
  dbUser: string;
  dbHost: string;
  dbPort: number;
  nodeAction: string;
  jaegerIP: string;
  jaegerPort: number;
  disableJaeger: boolean;
  lokiHost: string;
}

export interface KeyPairsIndexer {
  [publicKey: string]: KeyPair;
}

export interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
}

export interface NaclKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
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

export interface PeerStateWrapper {
  peer: SimplePeerInfo;
  height: string;
  error?: string;
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

export type IBlockWithTransactions = SetRequired<IBlock, 'transactions'>;

export interface IBlockWithoutId {
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

export interface IBlockWithoutSignatureId {
  height: string;
  version: number;
  timestamp: number;
  prevBlockId?: any;
  count: number;
  fees: string;
  reward: string;
  payloadHash: string;
  delegate: string;
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
  | 'lockAmount'
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

export interface BufferList {
  toString(): string;
}

export interface P2PMessage {
  from: string;
  data: Uint8Array;
  seqno: Uint8Array;
  topicIDs: string[];
  signature: Uint8Array;
  key: Uint8Array;
}

export interface P2PPeerIdAndMultiaddr {
  peerId: string;
  multiaddr: string[];
}

export interface BlockIdWrapper {
  id: string;
}

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
  block: IBlockWithTransactions;
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

export interface OnlyAddress {
  address: string;
}

export interface OnlyUserName {
  username: string;
}

export type AddressOrUsername = OnlyAddress | OnlyUserName;
export interface ApiError<T> {
  success: false;
  error: T | string;
}

export interface ApiSuccess {
  success: true;
}

export type ApiResult<K, T = string> = (K & ApiSuccess) | ApiError<T>;
export type P2PApiResult<K, T = string> = K | ApiError<T>;

export type OffsetAndLimitError =
  | 'child "offset" fails because ["offset" must be a number]'
  | 'child "limit" fails because ["limit" must be a number]'
  | 'child "offset" fails because ["offset" must be larger than or equal to 0]'
  | 'child "limit" fails because ["limit" must be less than or equal to 100]';

export type ParamsError = 'Invalid params';

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
  | ParamsError;

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

export type DelegateError = 'Account not found' | ServerError;

export interface CountWrapper {
  count: number;
}

export interface PulicKeyWrapper {
  publicKey: string;
}

export interface BlockWrapper {
  block: IBlock;
}

export interface BlocksWrapper {
  count?: string;
  blocks: IBlock[];
}

export interface BlocksWrapperParams {
  limit: number;
  lastBlockId: string;
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

export interface SimpleAccountsWrapper {
  delegates: IDelegate[];
}

export interface AccountsWrapper {
  accounts: AccountWeightViewModel[];
}

export type DelegateAddressOrUsername =
  | { username: string }
  | { address: string };

export interface DelegateWrapper {
  delegate: DelegateViewModel;
}

export interface OffsetOrLimit {
  offset?: number;
  limit?: number;
}

export interface PublicKeyInterface {
  publicKey: string;
}

export interface UsernameInterface {
  username: string;
}

export interface AddressInterface {
  address: string;
}

export type OwnProducedBlocksQuery =
  | OffsetOrLimit
  | (OffsetOrLimit & PublicKeyInterface)
  | (OffsetOrLimit & UsernameInterface)
  | (OffsetOrLimit & AddressInterface);

export interface DelegateOwnProducedBlocks {
  delegate: DelegateViewModel;
  blocks: IBlock[];
}

export interface DelegatesWrapper {
  totalCount?: number;
  delegates: DelegateViewModel[];
}

export interface DelegateStateWrapper {
  delegate: DelegateViewModel;
  block: IBlock;
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

export interface PeerInfoWrapper {
  id: string;
  multiaddrs: string[];
  publicIp: string;
  address: string;
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
  count?: number;
  transactions: Array<UnconfirmedTransaction | ITransaction>;
}

export interface UnconfirmedTransactionsWrapper {
  transactions: Array<UnconfirmedTransaction>;
}

export interface TransactionIdWrapper {
  transactionId: string;
}

export interface TransfersWrapper {
  count: number;
  transfers: ITransfer[];
}

export interface AmountWrapper {
  count: number;
  strTotalAmount: string;
}

export interface CommonBlockWrapper {
  common: IBlock;
}

export interface IssuerWrapper {
  issuer: IIssuer;
}

export interface IssuesWrapper {
  count: number;
  issues: IIssuer[];
}

export interface IAssetHolder {
  address: String;
  currency: String;
  balance: String;
}

export interface AssetHoldersWrapper {
  count: number;
  holders: IAssetHolder[];
}

export interface IsIssuerWrapper {
  isIssuer: boolean;
  issuerName: string | undefined;
}

export interface AssetsWrapper {
  count: number;
  assets: IAsset[];
}

export interface AssetWrapper {
  asset: IAsset;
}

export interface BalancesWrapper {
  count: number;
  balances: IBalance[];
}

export interface BalanceWrapper {
  balance: IBalance;
}

// Client

export type NetworkType = 'localnet' | 'testnet' | 'mainnet';

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

export type BlockError = 'Block not found';

export type NewBlockError =
  | 'Invalid params'
  | 'validation failed'
  | 'New block not found'
  | BlockError;

export type CommonBlockError =  // lack of specific validation error
  | 'too big min,max'
  | 'Blocks not found'
  | 'Common block not found'
  | 'Failed to find common block';

export type IssueError = 'Issuer not found';

export type AssetError = 'Asset not found';

export type BalanceError = 'Balance info not found';
