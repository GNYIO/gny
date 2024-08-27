import { Base } from './base.js';
import {
  UnconfirmedTransaction,
  TransactionIdWrapper,
  ApiResult,
} from '@gnyio/interfaces';
import { Connection } from '../connection.js';

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
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }
}
