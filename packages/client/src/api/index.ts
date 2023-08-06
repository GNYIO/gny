import { Block } from './block';
import { Account } from './account';
import { Delegate } from './delegate';
import { Transaction } from './transaction';
import { Loader } from './loader';
import { Peer } from './peer';
import { System } from './system';
import { Transfer } from './transfer';
import { Transport } from './transport';
import { Uia } from './uia';
import { Exchange } from './exchange';
import { Connection } from '../connection';
import { Nft } from './nft';

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
    Nft: new Nft(connection),
  };
};
