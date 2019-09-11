import { Basic } from './basic';

export class Transfer extends Basic {
  public async getRoot(
    ownerId: string,
    currency: string,
    limit?: string | number,
    offset?: string | number
  ) {
    const params = {
      ownerId,
      currency,
      limit,
      offset,
    };
    return await this.get('/api/transfers', params);
  }

  public async getAmount(startTimestamp: string, endTimestamp: string) {
    const params = {
      startTimestamp,
      endTimestamp,
    };
    return await this.get('/api/transfers', params);
  }
}
