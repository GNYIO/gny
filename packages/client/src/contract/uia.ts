import { Base } from '../api/base';
import { uia } from '../';

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
    return await this.post('/peer/transactions', params);
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
    return await this.post('/peer/transactions', params);
  }
}
