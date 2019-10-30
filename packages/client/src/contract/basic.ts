import { Base } from '../api/base';
import { basic } from '../';

export class Basic extends Base {
  public async setUserName(
    username: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = basic.setUserName(username, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }

  public async lockAccount(height: number, amount: number, secret: string) {
    const trs = basic.lock(height, amount, secret);
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }

  public async unlockAccount(secrete: string) {
    const trs = basic.unlock(secrete);
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }

  public async registerDelegate(secret: string) {
    const trs = basic.registerDelegate(secret);
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }

  public async send(
    recipient: string,
    amount: string,
    secret: string,
    message?: string,
    secondeSecret?: string
  ) {
    const trs = basic.transfer(
      recipient,
      amount,
      message,
      secret,
      secondeSecret
    );
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }

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
