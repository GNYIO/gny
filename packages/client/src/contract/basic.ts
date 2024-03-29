import { Base } from '../api/base';
import { basic, Connection } from '../';
import { ApiResult, TransactionIdWrapper } from '@gny/interfaces';

export class Basic {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async setUserName(
    username: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = basic.setUserName(username, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async lockAccount(
    height: string,
    amount: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = basic.lock(height, amount, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async unlockAccount(secret: string, secondSecret?: string) {
    const trs = basic.unlock(secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async registerDelegate(secret: string, secondSecret?: string) {
    const trs = basic.registerDelegate(secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
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
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async vote(keyList: string[], secret: string, secondSecret?: string) {
    const trs = basic.vote(keyList, secret, secondSecret);
    const params = {
      transaction: trs,
    };

    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
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
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async setSecondPassphrase(secret: string, secondSecret: string) {
    const trs = basic.setSecondPassphrase(secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async burn(amount: string, secret: string, secondSecret?: string) {
    const trs = basic.burn(amount, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }
}
