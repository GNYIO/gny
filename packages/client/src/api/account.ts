import { Base } from './base';
import {
  DelegateViewModel,
  IBalance,
  ApiResponse,
  AccountGenerateModel,
  IAccount,
  ServerError,
  AccountOpenModel,
  ResponseError,
  BalanceResponseError,
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
  public async generateAccount<
    T = AccountGenerateModel,
    K = ServerError
  >(): Promise<ApiResponse<T, K>> {
    return await this.get('/api/accounts/generateAccount');
  }

  public async openAccount<T = AccountOpenModel, K = ResponseError>(
    secret: string
  ): Promise<ApiResponse<T, K>> {
    return await this.post('/api/accounts/open', { secret: secret });
  }

  public async getBalance<T = BalanceResult, K = ResponseError>(
    address: string
  ): Promise<ApiResponse<T, K>> {
    const params = { address: address };
    return await this.get('/api/accounts/getBalance', params);
  }

  public async getAddressCurrencyBalance<
    T = IBalance,
    K = BalanceResponseError
  >(address: string, currency: string): Promise<ApiResponse<T, K>> {
    return await this.get(`/api/accounts/${address}/${currency}`);
  }

  public async getAccountByAddress<T = AccountOpenModel, K = ResponseError>(
    address: string
  ): Promise<ApiResponse<T, K>> {
    const params = { address: address };
    return await this.get('/api/accounts/', params);
  }

  public async getAccountByUsername<T = IAccount, K = ResponseError>(
    username: string
  ): Promise<ApiResponse<T, K>> {
    const params = { username: username };
    return await this.get('/api/accounts/', params);
  }

  public async getVotedDelegates<T = DelegateResult, K = ResponseError>(
    query: OnlyAddress | OnlyUserName
  ): Promise<ApiResponse<T, K>> {
    return await this.get('/api/accounts/getVotes', query);
  }

  public async countAccounts<T = CountResult, K = ServerError>(): Promise<
    ApiResponse<T, K>
  > {
    return await this.get('/api/accounts/count');
  }

  public async getPublicKey<
    T = Pick<IAccount, 'publicKey'>,
    K = ResponseError | PublicKeyError
  >(address: string): Promise<ApiResponse<T, K>> {
    const params = {
      address: address,
    };
    return await this.get('/api/accounts/getPublicKey', params);
  }

  public async generatePublicKey<
    T = Pick<IAccount, 'publicKey'>,
    K = ResponseError
  >(secret: string): Promise<ApiResponse<T, K>> {
    const params = {
      secret: secret,
    };
    return await this.post('/api/accounts/generatePublicKey', params);
  }
}
