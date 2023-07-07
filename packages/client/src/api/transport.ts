import { Base } from './base';
import {
  UnconfirmedTransaction,
  TransactionIdWrapper,
  ApiResult,
} from '@gny/interfaces';
import { Connection } from '../connection';

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
