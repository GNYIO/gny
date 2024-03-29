import { Base } from './base';
import {
  ApiResult,
  TransfersWrapper,
  ValidationError,
  AmountWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

interface Query {
  ownerId?: string;
  currency?: string;
  senderId?: string;
  recipientId?: string;
  limit?: string | number;
  offset?: string | number;
}
export class Transfer {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getRoot(query: Partial<Query>) {
    const params = {
      ownerId: query.ownerId,
      currency: query.currency,
      limit: query.limit,
      offset: query.offset,
      senderId: query.senderId,
      recipientId: query.recipientId,
    };
    const res = await this.base.get('/api/transfers', params);
    const result: ApiResult<TransfersWrapper, ValidationError> = res.data;
    return result;
  }

  public async getAmount(startTimestamp: string, endTimestamp: string) {
    const params = {
      startTimestamp,
      endTimestamp,
    };
    const res = await this.base.get('/api/transfers/amount', params);
    const result: ApiResult<AmountWrapper, ValidationError> = res.data;
    return result;
  }
}
