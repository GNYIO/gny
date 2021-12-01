import { Base } from './base';
import {
  ApiResult,
  TransactionsWrapper,
  TransactionCountWrapper,
  NewestTransactionWrapper,
  ValidationError,
  ServerError,
  UnconfirmedTransactionWrapper,
  TransactionError,
  UnconfirmedTransaction,
  UnconfirmedTransactionsWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

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

interface CountQuery {
  senderId?: string;
  senderPublicKey?: string;
}

interface NewestFirstQuery {
  count: number;
  offset?: number;
  limit?: number;
  senderId?: string;
  senderPublicKey?: string;
}

export class Transaction {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getCount(countQuery?: CountQuery) {
    // const params = {
    //   senderId: typeof countQuery === "undefined" ? undefined : countQuery.senderId,
    //   senderPublicKey: typeof countQuery === "undefined" ? undefined : countQuery.senderPublicKey,
    // };

    const res = await this.base.get('/api/transactions/count', countQuery);
    const result: ApiResult<
      TransactionCountWrapper,
      ValidationError | ServerError
    > = res.data;
    return result;
  }

  public async newestFirst(newestFirstQuery: NewestFirstQuery) {
    const params = {
      count: newestFirstQuery.count,
      offset: newestFirstQuery.offset,
      limit: newestFirstQuery.limit,
      senderId: newestFirstQuery.senderId,
      senderPublicKey: newestFirstQuery.senderPublicKey,
    };
    const res = await this.base.get('/api/transactions/newestFirst', params);
    const result: ApiResult<
      NewestTransactionWrapper,
      ValidationError | ServerError
    > = res.data;
    return result;
  }

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
    const res = await this.base.get('/api/transactions/', params);
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
    const res = await this.base.get(
      '/api/transactions/unconfirmed/get',
      params
    );
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
    const res = await this.base.get('/api/transactions/unconfirmed', params);
    const result: ApiResult<UnconfirmedTransactionsWrapper, ValidationError> =
      res.data;
    return result;
  }

  public async addTransactions(transactions: UnconfirmedTransaction[]) {
    const params = {
      transactions: transactions,
    };
    const res = await this.base.put('/api/transactions/batch', params);
    const result: ApiResult<
      TransactionsWrapper,
      ValidationError | TransactionError
    > = res.data;
    return result;
  }
}
