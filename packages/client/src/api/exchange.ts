import { Base } from './base';
import {
  ApiResult,
  AccountGenerateModel,
  GetAccountError,
  ServerError,
  AccountOpenModel,
  PublicKeyWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

export class Exchange {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async openAccount(secret: string) {
    const res = await this.base.post('/api/exchange/openAccount', {
      secret: secret,
    });
    const result: ApiResult<AccountOpenModel, GetAccountError> = res.data;
    return result;
  }

  public async generateAccount() {
    const res = await this.base.post('/api/exchange/generateAccount');
    const result: ApiResult<AccountGenerateModel, ServerError> = res.data;
    return result;
  }

  public async generatePublicKey(secret: string) {
    const res = await this.base.post('/api/exchange/generatePublicKey', {
      secret: secret,
    });
    const result: ApiResult<PublicKeyWrapper, ServerError> = res.data;
    return result;
  }
}
