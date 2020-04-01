import { Base } from './base';
import {
  UnconfirmedTransaction,
  TransactionIdWrapper,
  P2PApiResult,
} from '@gny/interfaces';
import { Connection } from '../connection';

interface Keypair {
  publicKey: string;
  signature: string;
}
interface Votes {
  height: string;
  id: string;
  signatures: Keypair[];
}

export class Transport {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async sendTransaction(transaction: UnconfirmedTransaction) {
    const params = {
      transaction: transaction,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: P2PApiResult<TransactionIdWrapper> = res.data;
    return result;
  }
}
