import { Base } from './base';
import {
  ApiResult,
  AccountGenerateModel,
  GetAccountError,
  ServerError,
  AccountOpenModel,
  PulicKeyWrapper,
} from '@gny/interfaces';

export class Exchange extends Base {
  public async openAccount(secret: string) {
    const res = await this.post('/api/exchange/openAccount', {
      secret: secret,
    });
    const result: ApiResult<AccountOpenModel, GetAccountError> = res.data;
    return result;
  }

  public async generateAccount() {
    const res = await this.post('/api/exchange/generateAccount');
    const result: ApiResult<AccountGenerateModel, ServerError> = res.data;
    return result;
  }

  public async generatePublicKey(secret: string) {
    const res = await this.post('/api/exchange/generatePublicKey', {
      secret: secret,
    });
    const result: ApiResult<PulicKeyWrapper, ServerError> = res.data;
    return result;
  }
}
