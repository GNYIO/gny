
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

// IServer import
import * as express from 'express'
import { Server } from 'http'
import * as SocketIO from 'socket.io'

// IApp
import { AschCore } from 'asch-smartdb';
import BalanceManager from './smartdb/balance-manager'
import AutoIncrement from './smartdb/auto-increment'
import * as bignumber from 'bignumber'

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
  network: INetwork;
  dbSequence: Sequence;
  sequence: Sequence;
  balancesSequence: Sequence;
  base: IBase;
  bus: EventEmitter & IMessageEmitter;
  modules: Modules;
  connect: INetwork;
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


export interface IMessageEmitter {
  message: (topic: string, ...restArgs: any[]) => void
}

export interface INetwork {
  express: typeof express
  app: express.Application;
  server: Server;
  io: SocketIO.Server;
  sslServer?: Server;
  sslio?: SocketIO.Server;
}

interface IUtil {
  address: any;
  bignumber: bignumber;
  transactionMode: any;
}

interface IValidatorConstraints {
  length?: number;
  isEmail?: boolean;
  url?: boolean;
  number?: boolean;
}

interface IValidators {
  amount: (amount: any) => string;
  name: (amount: any) => string;
  publickey: (value: any) => string;
  string: (value: any, constraints: IValidatorConstraints) => any;
}

type ICurrency = string
type IFee = string

interface ICurrencyFee {
  currency: ICurrency;
  min: IFee;
}

interface IApp {
  sdb: AschCore.SmartDB;
  balances: BalanceManager;
  autoID: AutoIncrement;
  events: EventEmitter;
  util: IUtil;
  validators: IValidators;
  validate: (type: string, value: any, constraints: IValidatorConstraints) => void | never;
  registerContract: (type: number, name: string) => void;
  getContractName: (type: string) => any;
  contractTypeMapping: {
    [type: string]: string;
  };
  registerFee: (type: number, min: string, currency: string) => void;
  defaultFee: ICurrencyFee;
  feeMapping: {
    [type: string]: ICurrencyFee;
  };
  getFee: (type: string) => ICurrencyFee;
  setDefaultFee: (min: string, currency: string) => void;
  addRoundFee: (fee: IFee, roundNumber: number) => void;
  getRealTime: (epochTime: number) => number;
  hooks: {
    [name: string]: () => void
  };
  registerHook: (name: string, func: () => void) => void;
  isCurrentBookkeeper: (addr: string) => boolean;
  AccountRole: {
    DELEGATE: number;
    AGENT: number;
    GATEWAY_VALIDATOR: number;
  };
  logger: tracer.Tracer.Logger;
}


declare global {
  namespace NodeJS {
    interface Global {
      library: Partial<IScope>;
      modules: Modules;
      app: Partial<IApp>;
    }
  }
}
