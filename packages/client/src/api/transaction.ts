import { Base } from './base';
import {
  ApiResult,
  TransactionsWrapper,
  ValidationError,
  ServerError,
  UnconfirmedTransactionWrapper,
  TransactionError,
  UnconfirmedTransaction,
  UnconfirmedTransactionsWrapper,
} from '@gny/interfaces';

interface Query {
  limit?: number;
  offset?: number;
  id?: string;
  senderId?: string;
  senderPublicKey?: string;
  blockId?: string;
  type?: number;
  height?: number | string;
  message?: string;
}
export class Transaction extends Base {
  public async getTransactions(query: Query) {
    const params = {
      limit: query.limit,
      offset: query.offset,
      id: query.id,
      senderId: query.senderId,
      senderPublicKey: query.senderPublicKey,
      blockId: query.blockId,
      type: query.type,
      height: query.height,
      message: query.message,
    };
    const res = await this.get('/api/transactions/', params);
    const result: ApiResult<
      TransactionsWrapper,
      ValidationError | ServerError
    > = res.data;
    return result;
  }

  public async getUnconfirmedTransaction(id: string) {
    const params = {
      id: id,
    };
    const res = await this.get('/api/transactions/unconfirmed/get', params);
    const result: ApiResult<
      UnconfirmedTransactionWrapper,
      ValidationError | TransactionError
    > = res.data;
    return result;
  }

  public async getUnconfirmedTransactions(
    senderPublicKey: string,
    address: string
  ) {
    const params = {
      senderPublicKey: senderPublicKey,
      address: address,
    };
    const res = await this.get('/api/transactions/unconfirmed', params);
    const result: ApiResult<UnconfirmedTransactionsWrapper, ValidationError> =
      res.data;
    return result;
  }

  public async addTransactions(transactions: UnconfirmedTransaction[]) {
    const params = {
      transactions: transactions,
    };
    const res = await this.put('/api/transactions/batch', params);
    const result: ApiResult<
      TransactionsWrapper,
      ValidationError | TransactionError
    > = res.data;
    return result;
  }
}
