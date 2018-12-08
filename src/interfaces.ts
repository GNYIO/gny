
import server from './core/server'
import accounts from './core/accounts'
import transactions from './core/transactions'
import loader from './core/loader'
import system from './core/system'
import peer from './core/peer'
import transport from './core/transport'
import delegates from './core/delegates'
import round from './core/round'
import uia from './core/uia'
import blocks from './core/blocks'

import { Consensus as BaseConsensus } from './base/consensus'
import { Transaction as BaseTransaction } from './base/transaction'
import { Block as BaseBlock } from './base/block'

import { Protobuf } from './utils/protobuf'
import * as tracer from 'tracer'
import * as zSchema from 'z-schema'

import Sequence from './utils/sequence'
import { EventEmitter } from 'events';

declare interface IBase {
  bus: any;
  scheme: zSchema;
  genesisBlock: any;
  consensus: BaseConsensus;
  transaction: BaseTransaction;
  block: BaseBlock;
}

export interface IScope {
  protobuf: Protobuf;
  config: any;
  logger: tracer.Tracer.Logger;
  genesisBlock: any;
  scheme: zSchema;
  network: any;
  dbSequence: Sequence;
  sequence: Sequence;
  balancesSequence: Sequence;
  base: IBase;
  bus: EventEmitter;
  modules: Modules;
}

export interface Modules {
  server: server;
  accounts: accounts;
  transactions: transactions;
  loader: loader;
  system: system;
  peer: peer;
  transport: transport;
  delegates: delegates;
  round: round;
  uia: uia;
  blocks: blocks;
}
