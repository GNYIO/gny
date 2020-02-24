import { Base } from '../api/base';
import { basic } from '../';
import { ApiResult, TransactionIdWrapper } from '@gny/interfaces';

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
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async lockAccount(height: number, amount: number, secret: string) {
    const trs = basic.lock(height, amount, secret);
    const params = {
      transaction: trs,
    };
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async unlockAccount(secret: string) {
    const trs = basic.unlock(secret);
    const params = {
      transaction: trs,
    };
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async registerDelegate(secret: string) {
    const trs = basic.registerDelegate(secret);
    const params = {
      transaction: trs,
    };
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
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
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async vote(
    usernames: string[],
    secret: string,
    secondSecret?: string
  ) {
    const trs = basic.vote(usernames, secret, secondSecret);
    const params = {
      transaction: trs,
    };

    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async unvote(
    usernames: string[],
    secret: string,
    secondSecret?: string
  ) {
    const trs = basic.unvote(usernames, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }
}
