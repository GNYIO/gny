import {
  ITransaction,
  KeyPair,
  KeyPairsIndexer,
  BlockAndVotes,
  UnconfirmedTransaction,
  IBlock,
} from '@gnyio/interfaces';
import { IState } from '../globalInterfaces.js';
import { TransactionPoolPersistent } from '@gnyio/transaction-pool-persistent';
import { LimitCache } from '@gnyio/utils';
import LRU from 'lru-cache';
import { copyObject } from '@gnyio/base';

// state management
export function getInitialState() {
  const state: IState = {
    // TODO: check correct init values
    votesKeySet: {},
    pendingBlock: undefined,
    pendingVotes: undefined,

    lastBlock: undefined,

    proposeCache: {},
    lastPropose: null,
    privIsCollectingVotes: false,
    lastVoteTime: undefined,
  };

  return state;
}

export function setState(state: IState) {
  global.state = state;
}

export function stateBeforeRollback(lastBlock: IBlock) {
  const state: IState = {
    votesKeySet: {},
    pendingBlock: undefined,
    pendingVotes: undefined,

    lastBlock: lastBlock,

    proposeCache: {},
    lastPropose: null,
    privIsCollectingVotes: false,
    lastVoteTime: undefined,
  };
  return state;
}

/**
 * returns always a deepCopy of the current state
 */
export function getState() {
  const state = copyState(global.state);
  return state;
}

export function copyState(state: IState) {
  return copyObject(state);
}

// keyPairs
export function getInitialKeyPairs() {
  return {} as KeyPairsIndexer;
}
export function SetKeyPairs(keyPairs: KeyPairsIndexer) {
  global.keyPairs = keyPairs;
}
export function GetKeyPairs() {
  return global.keyPairs;
}
export function isPublicKeyInKeyPairs(publicKey: string) {
  if (global.keyPairs[publicKey]) {
    return true;
  } else {
    return false;
  }
}
export function setKeyPair(publicKey: string, keys: KeyPair) {
  global.keyPairs[publicKey] = keys;
}
export function removeKeyPair(publicKey: string) {
  delete global.keyPairs[publicKey];
}

// isForgingEnabled
export function IsForgingEnabled() {
  return global.isForgingEnabled;
}
export function SetForgingEnabled(newStatus: boolean) {
  global.isForgingEnabled = newStatus;
}

// privSyncing
export function IsSyncing() {
  return global.privSyncing;
}
export function SetIsSyncing(newState: boolean) {
  global.privSyncing = newState;
}

// blocksToSync
export function SetBlocksToSync(height: number) {
  global.blocksToSync = height;
}
export function GetBlocksToSync() {
  return global.blocksToSync;
}

// Transaction Pool
export function InitializeTransactionPool() {
  global.transactionPool = new TransactionPoolPersistent(':memory:');
}
export function GetUnconfirmedTransaction(id: string) {
  return global.transactionPool.get(id);
}
export function GetUnconfirmedTransactionList() {
  return global.transactionPool.getUnconfirmed();
}
export function TrsAlreadyInUnconfirmedPool(id: string) {
  return global.transactionPool.has(id);
}
export function ClearUnconfirmedTransactions() {
  global.transactionPool.clear();
}
export function AddUnconfirmedTransactions(
  transaction: ITransaction | UnconfirmedTransaction
) {
  global.transactionPool.add(transaction);
}

// failedTrsCache
export function InitializeFailedTrsCache() {
  global.failedTrsCache = new LimitCache<string, boolean>();
}
export function TrsAlreadyFailed(key: string) {
  return global.failedTrsCache.has(key);
}
export function AddFailedTrs(key: string) {
  global.failedTrsCache.set(key, true);
}

// allModulesLoaded (new)
export function InitializeModulesAreLoaded() {
  global.areAllModulesLoaded = false;
}
export function ModulesAreLoaded() {
  return global.areAllModulesLoaded;
}
export function SetAllModulesLoaded(newVal: boolean) {
  global.areAllModulesLoaded = newVal;
}

// blockchainReady (new)
export function InitializeBlockchainReady() {
  global.blockchainReady = false;
}
export function BlockchainReady() {
  return global.blockchainReady;
}
export function SetBlockchainReady(newVal: boolean) {
  global.blockchainReady = newVal;
}

// latestBlocksCache
export function InitializeLatestBlockCache() {
  global.latestBlocksCache = new LRU<string, BlockAndVotes>({
    max: 200,
  });
}
export function SetBlockToLatestBlockCache(
  blockId: string,
  blockAndVotes: BlockAndVotes
) {
  global.latestBlocksCache.set(blockId, blockAndVotes);
}
export function GetBlockFromLatestBlockCache(blockId: string) {
  return global.latestBlocksCache.get(blockId);
}
