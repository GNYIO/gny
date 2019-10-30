import { Base } from './base';

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
    return await this.get('/api/transfers', params);
  }

  public async getAmount(startTimestamp: string, endTimestamp: string) {
    const params = {
      startTimestamp,
      endTimestamp,
    };
    return await this.get('/api/transfers/amount', params);
  }
}
