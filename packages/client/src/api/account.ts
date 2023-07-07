import { Base } from './base';
import {
  ApiResult,
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
  PublicKeyWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

interface OnlyAddress {
  address: string;
}

interface OnlyUserName {
  username: string;
}

export class Account {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async openAccount(
    publicKey: string
  ): Promise<ApiResult<AccountOpenModel, GetAccountError>> {
    const res = await this.base.post('/api/accounts/openAccount', {
      publicKey: publicKey,
    });
    const result: ApiResult<AccountOpenModel, GetAccountError> = res.data;
    return result;
  }

  public async getBalance(
    address: string
  ): Promise<ApiResult<BalancesModel, ResponseError>> {
    const params = { address: address };
    const res = await this.base.get('/api/accounts/getBalance', params);
    const result: ApiResult<BalancesModel, ResponseError> = res.data;
    return result;
  }

  public async getAddressCurrencyBalance(
    address: string,
    currency: string
  ): Promise<
    ApiResult<IBalanceWrapper, ValidationError | BalanceResponseError>
  > {
    const res = await this.base.get(`/api/accounts/${address}/${currency}`);
    const result: ApiResult<
      IBalanceWrapper,
      ValidationError | BalanceResponseError
    > = res.data;
    return result;
  }

  public async getAccountByAddress(
    address: string
  ): Promise<ApiResult<IAccount, ServerError>> {
    const params = { address: address };
    const res = await this.base.get('/api/accounts/', params);
    const result: ApiResult<IAccount, ServerError> = res.data;
    return result;
  }

  public async getAccountByUsername(
    username: string
  ): Promise<ApiResult<IAccount, ServerError>> {
    const params = { username: username };
    const res = await this.base.get('/api/accounts/', params);
    const result: ApiResult<IAccount, ServerError> = res.data;
    return result;
  }

  public async getVotedDelegates(
    query: OnlyAddress | OnlyUserName
  ): Promise<ApiResult<DelegatesWrapper, DelegateError>> {
    const res = await this.base.get('/api/accounts/getVotes', query);
    const result: ApiResult<DelegatesWrapper, DelegateError> = res.data;
    return result;
  }

  public async countAccounts(): Promise<ApiResult<CountWrapper, ServerError>> {
    const res = await this.base.get('/api/accounts/count');
    const result: ApiResult<CountWrapper, ServerError> = res.data;
    return result;
  }

  public async getPublicKey(
    address: string
  ): Promise<ApiResult<PublicKeyWrapper, GetAccountError>> {
    const params = {
      address: address,
    };
    const res = await this.base.get('/api/accounts/getPublicKey', params);
    const result: ApiResult<PublicKeyWrapper, GetAccountError> = res.data;
    return result;
  }
}
