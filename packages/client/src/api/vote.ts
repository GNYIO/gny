import { Base } from './base';
import { basic } from '../';

export class Vote extends Base {
  public async vote(keyList: string[], secret: string, secondSecret?: string) {
    const trs = basic.vote(keyList, secret, secondSecret);
    const params = {
      transaction: trs,
    };

    return await this.post('/peer/transactions', params);
  }

  public async unvote(
    keyList: string[],
    secret: string,
    secondSecret?: string
  ) {
    const trs = basic.unvote(keyList, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }
}
