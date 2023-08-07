import { Base } from '../api/base';
import { nft, Connection } from '../';
import { ApiResult, TransactionIdWrapper } from '@gny/interfaces';

export class Nft {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async registerNftMaker(
    name: string,
    desc: string,
    message: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = nft.registerNftMaker(name, desc, message, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    const res = await this.base.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async createNft(
    nftName: string,
    cid: string,
    makerId: string,
    message: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = nft.createNft(
      nftName,
      cid,
      makerId,
      message,
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
