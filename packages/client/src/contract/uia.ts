import { Base } from '../api/base';
import { uia } from '../';
import { ApiResult, TransactionIdWrapper } from '@gny/interfaces';

export class Uia extends Base {
  public async registerIssuer(
    name: string,
    desc: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = uia.registerIssuer(name, desc, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async registerAsset(
    name: string,
    desc: string,
    maximum: string,
    precision: number,
    secret: string,
    secondSecret?: string
  ) {
    const trs = uia.registerAsset(
      name,
      desc,
      maximum,
      precision,
      secret,
      secondSecret
    );
    const params = {
      transaction: trs,
    };
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async issueAsset(
    currency: string,
    amount: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = uia.issue(currency, amount, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }
}
