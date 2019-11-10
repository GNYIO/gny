import { Base } from './base';
import {
  DelegateViewModel,
  IBalance,
  ApiResult,
  AccountGenerateModel,
  GetAccountError,
  BalancesModel,
  IBalanceWrapper,
  IAccount,
  ServerError,
  AccountOpenModel,
  ResponseError,
  BalanceResponseError,
  ValidationError,
  DelegatesWrapper,
  DelegateError,
  CountWrapper,
  PulicKeyWapper,
} from '@gny/interfaces';

interface OnlyAddress {
  address: string;
}

interface OnlyUserName {
  username: string;
}

interface BalanceResult {
  count: number;
  balances: IBalance[];
}

interface DelegateResult {
  delegates: DelegateViewModel[];
}

interface CountResult {
  count: number;
}

type PublicKeyError = 'Can not find public key';

export class Account extends Base {
  public async generateAccount() {
    const res = await this.get('/api/accounts/generateAccount');
    const result: ApiResult<AccountGenerateModel, ServerError> = res.data;
    return result;
  }

  public async openAccount(secret: string) {
    const res = await this.post('/api/accounts/open', { secret: secret });
    const result: ApiResult<AccountOpenModel, GetAccountError> = res.data;
    return result;
  }

  public async getBalance(address: string) {
    const params = { address: address };
    const res = await this.get('/api/accounts/getBalance', params);
    const result: ApiResult<BalancesModel, ResponseError> = res.data;
    return result;
  }

  public async getAddressCurrencyBalance(address: string, currency: string) {
    const res = await this.get(`/api/accounts/${address}/${currency}`);
    const result: ApiResult<
      IBalanceWrapper,
      ValidationError | BalanceResponseError
    > = res.data;
    return result;
  }

  public async getAccountByAddress(address: string) {
    const params = { address: address };
    const res = await this.get('/api/accounts/', params);
    const result: ApiResult<AccountOpenModel, ServerError> = res.data;
    return result;
  }

  public async getAccountByUsername(username: string) {
    const params = { username: username };
    const res = await this.get('/api/accounts/', params);
    const result: ApiResult<IAccount, ServerError> = res.data;
    return result;
  }

  public async getVotedDelegates(query: OnlyAddress | OnlyUserName) {
    const res = await this.get('/api/accounts/getVotes', query);
    const result: ApiResult<DelegatesWrapper, DelegateError> = res.data;
    return result;
  }

  public async countAccounts() {
    const res = await this.get('/api/accounts/count');
    const result: ApiResult<CountWrapper, ServerError> = res.data;
    return result;
  }

  public async getPublicKey(address: string) {
    const params = {
      address: address,
    };
    const res = await this.get('/api/accounts/getPublicKey', params);
    const result: ApiResult<PulicKeyWapper, GetAccountError> = res.data;
    return result;
  }

  public async generatePublicKey(secret: string) {
    const params = {
      secret: secret,
    };
    const res = await this.post('/api/accounts/generatePublicKey', params);
    const result: ApiResult<PulicKeyWapper, ServerError> = res.data;
    return result;
  }
}
