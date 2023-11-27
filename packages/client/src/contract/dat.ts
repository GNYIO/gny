import { Base } from '../api/base';
import { dat, Connection } from '../';
import { ApiResult, TransactionIdWrapper } from '@gny/interfaces';

export class Dat {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async registerDatMaker(
    name: string,
    desc: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = dat.registerDatMaker(name, desc, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async createDat(
    datName: string,
    hash: string,
    makerId: string,
    url: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = dat.createDat(
      datName,
      hash,
      makerId,
      url,
      secret,
      secondSecret
    );
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }
}
