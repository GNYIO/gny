import { Base } from './base';
import { basic } from '../../../packages/gny-client';

export class Vote extends Base {
  public async vote(keyList: string[], secrete: string, secondSecrete: string) {
    const trs = basic.vote(keyList, secrete, secondSecrete);
    const params = {
      transaction: trs,
    };

    return await this.post('/peer/transactions', params);
  }

  public async unvote(
    keyList: string[],
    secrete: string,
    secondSecrete: string
  ) {
    const trs = basic.unvote(keyList, secrete, secondSecrete);
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }
}
