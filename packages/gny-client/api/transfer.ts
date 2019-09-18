import { Base } from './base';
import { basic } from '../../../packages/gny-client';

interface Query {
  ownerId?: string;
  currency?: string;
  senderId?: string;
  recipientId?: string;
  limit?: string | number;
  offset?: string | number;
}
export class Transfer extends Base {
  public async getRoot(query: Query) {
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

  public async send(
    recipient: string,
    amount: string | number,
    message: string,
    secret: string,
    secondeSecret: string
  ) {
    const trs = basic.transfer(recipient, String(amount), message, secret);
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }
}
