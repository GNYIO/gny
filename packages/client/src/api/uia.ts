import { Base } from './base';
import {
  ApiResult,
  IssuesWrapper,
  ValidationError,
  IssuerWrapper,
  IssueError,
  IsIssuerWrapper,
  AssetsWrapper,
  AssetWrapper,
  AssetError,
  BalancesWrapper,
  BalanceWrapper,
  BalanceError,
  AssetHoldersWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

export class Uia {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getIssuers(
    limit?: number,
    offset?: number
  ): Promise<ApiResult<IssuesWrapper, ValidationError | string>> {
    const params = {
      limit: limit,
      offset: offset,
    };
    const res = await this.base.get('/api/uia/issuers', params);
    const result: ApiResult<IssuesWrapper, ValidationError | string> = res.data;
    return result;
  }

  public async isIssuer(
    address: string
  ): Promise<ApiResult<IsIssuerWrapper, ValidationError | string>> {
    const res = await this.base.get(`/api/uia/isIssuer/${address}`);
    const result: ApiResult<IsIssuerWrapper, ValidationError | string> =
      res.data;
    return result;
  }

  public async getIssuer(
    name: string
  ): Promise<ApiResult<IssuerWrapper, ValidationError | IssueError>> {
    const res = await this.base.get(`/api/uia/issuers/${name}`);
    const result: ApiResult<IssuerWrapper, ValidationError | IssueError> =
      res.data;
    return result;
  }

  public async getIssuerAssets(
    name: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResult<AssetsWrapper, ValidationError | string>> {
    const params = {
      limit: limit,
      offset: offset,
    };
    const res = await this.base.get(`/api/uia/issuers/${name}/assets`, params);
    const result: ApiResult<AssetsWrapper, ValidationError | string> = res.data;
    return result;
  }

  public async getAssets(
    limit?: number,
    offset?: number
  ): Promise<ApiResult<AssetsWrapper, ValidationError | string>> {
    const params = {
      limit: limit,
      offset: offset,
    };
    const res = await this.base.get('/api/uia/assets', params);
    const result: ApiResult<AssetsWrapper, ValidationError | string> = res.data;
    return result;
  }

  public async getAsset(
    name: string
  ): Promise<ApiResult<AssetWrapper, ValidationError | AssetError | string>> {
    const res = await this.base.get(`/api/uia/assets/${name}`);
    const result: ApiResult<
      AssetWrapper,
      ValidationError | AssetError | string
    > = res.data;
    return result;
  }

  public async getBalances(
    address: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResult<BalancesWrapper, ValidationError | string>> {
    const params = {
      limit: limit,
      offset: offset,
    };
    const res = await this.base.get(`/api/uia/balances/${address}`, params);
    const result: ApiResult<BalancesWrapper, ValidationError | string> =
      res.data;
    return result;
  }

  public async getBalance(
    address: string,
    currency: string
  ): Promise<
    ApiResult<BalanceWrapper, ValidationError | BalanceError | string>
  > {
    const res = await this.base.get(`/api/uia/balances/${address}/${currency}`);
    const result: ApiResult<
      BalanceWrapper,
      ValidationError | BalanceError | string
    > = res.data;
    return result;
  }

  public async getHolders(
    asset: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ApiResult<AssetHoldersWrapper, ValidationError | string>> {
    const res = await this.base.get(
      `/api/uia/holders/${asset}?limit=${limit}&offset=${offset}`
    );
    const result: ApiResult<AssetHoldersWrapper, ValidationError | string> =
      res.data;
    return result;
  }
}
