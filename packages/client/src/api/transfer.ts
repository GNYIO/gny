import { Base } from './base';
import {
  ApiResult,
  TransfersWrapper,
  ValidationError,
  AmountWapper,
} from '@gny/interfaces';

interface Query {
  ownerId?: string;
  currency?: string;
  senderId?: string;
  recipientId?: string;
  limit?: string | number;
  offset?: string | number;
}
export class Transfer extends Base {
  public async getRoot(query: Partial<Query>) {
    const params = {
      ownerId: query.ownerId,
      currency: query.currency,
      limit: query.limit,
      offset: query.offset,
    };
    const res = await this.get('/api/transfers', params);
    const result: ApiResult<TransfersWrapper, ValidationError> = res.data;
    return result;
  }

  public async getAmount(startTimestamp: string, endTimestamp: string) {
    const params = {
      startTimestamp,
      endTimestamp,
    };
    const res = await this.get('/api/transfers/amount', params);
    const result: ApiResult<AmountWapper, ValidationError> = res.data;
    return result;
  }
}
