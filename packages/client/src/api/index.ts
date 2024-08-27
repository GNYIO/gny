import { Block } from './block.js';
import { Account } from './account.js';
import { Delegate } from './delegate.js';
import { Transaction } from './transaction.js';
import { Loader } from './loader.js';
import { Peer } from './peer.js';
import { System } from './system.js';
import { Transfer } from './transfer.js';
import { Transport } from './transport.js';
import { Uia } from './uia.js';
import { Exchange } from './exchange.js';
import { Burn } from './burn.js';
import { Connection } from '../connection.js';
import { Dat } from './dat.js';
import { Verification } from './verification.js';

export const Api = (connection: Connection) => {
  return {
    Account: new Account(connection),
    Block: new Block(connection),
    Delegate: new Delegate(connection),
    Transaction: new Transaction(connection),
    Loader: new Loader(connection),
    Peer: new Peer(connection),
    System: new System(connection),
    Transfer: new Transfer(connection),
    Transport: new Transport(connection),
    Uia: new Uia(connection),
    Exchange: new Exchange(connection),
    Dat: new Dat(connection),
    Burn: new Burn(connection),
    Verification: new Verification(connection),
  };
};
