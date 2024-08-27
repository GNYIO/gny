import { Base } from '../api/base.js';
import { verification, Connection } from '../index.js';
import { ApiResult, TransactionIdWrapper } from '@gnyio/interfaces';

export class Verification {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async createVerification(
    identifier: string,
    signature: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = verification.createVerification(
      identifier,
      signature,
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
