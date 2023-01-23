import { Base } from './base';
import {
  ApiResult,
  CountWrapper,
  DelegateResponseError,
  AccountsWrapper,
  ValidationError,
  ServerError,
  DelegateWrapper,
  DelegateOwnProducedBlocks,
  OwnProducedBlocksQuery,
  DelegatesWrapperSimple,
  ExtendedDelegatesWrapper,
  ForgingError,
  ForgingStatus,
  SimpleAccountsWrapper,
  DelegateAddressOrUsername,
} from '@gny/interfaces';
import { Connection } from '../connection';

export class Delegate {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async count(): Promise<
    ApiResult<CountWrapper, DelegateResponseError>
  > {
    const res = await this.base.get('/api/delegates/count');
    const result: ApiResult<CountWrapper, DelegateResponseError> = res.data;
    return result;
  }

  public async getVoters(
    username: string
  ): Promise<ApiResult<AccountsWrapper, ValidationError | ServerError>> {
    const params = {
      username: username,
    };
    const res = await this.base.get('/api/delegates/getVoters', params);
    const result: ApiResult<AccountsWrapper, ValidationError | ServerError> =
      res.data;
    return result;
  }

  public async getOwnVotes(
    params: DelegateAddressOrUsername
  ): Promise<ApiResult<SimpleAccountsWrapper, ValidationError | ServerError>> {
    const res = await this.base.get('/api/delegates/getOwnVotes', params);
    const result: ApiResult<
      SimpleAccountsWrapper,
      ValidationError | ServerError
    > = res.data;
    return result;
  }

  public async getDelegateByPubKey(
    publicKey: string
  ): Promise<
    ApiResult<DelegateWrapper, ValidationError | DelegateResponseError>
  > {
    const params = {
      publicKey: publicKey,
    };
    const res = await this.base.get('/api/delegates/get', params);
    const result: ApiResult<
      DelegateWrapper,
      ValidationError | DelegateResponseError
    > = res.data;
    return result;
  }

  public async getDelegateByUsername(
    username: string
  ): Promise<
    ApiResult<DelegateWrapper, ValidationError | DelegateResponseError>
  > {
    const params = {
      username: username,
    };
    const res = await this.base.get('/api/delegates/get', params);
    const result: ApiResult<
      DelegateWrapper,
      ValidationError | DelegateResponseError
    > = res.data;
    return result;
  }

  public async getDelegateByAddress(
    address: string
  ): Promise<
    ApiResult<DelegateWrapper, ValidationError | DelegateResponseError>
  > {
    const params = {
      address: address,
    };
    const res = await this.base.get('/api/delegates/get', params);
    const result: ApiResult<
      DelegateWrapper,
      ValidationError | DelegateResponseError
    > = res.data;
    return result;
  }

  public async ownProducedBlocks(
    params: OwnProducedBlocksQuery
  ): Promise<ApiResult<DelegateOwnProducedBlocks, ValidationError>> {
    const res = await this.base.get('/api/delegates/ownProducedBlocks', params);
    const result: ApiResult<DelegateOwnProducedBlocks, ValidationError> =
      res.data;
    return result;
  }

  public async getDelegates(
    offset?: string,
    limit?: string
  ): Promise<
    ApiResult<ExtendedDelegatesWrapper, ValidationError | DelegateResponseError>
  > {
    const params = {
      offset: offset,
      limit: limit,
    };
    const res = await this.base.get('/api/delegates', params);
    const result: ApiResult<
      ExtendedDelegatesWrapper,
      ValidationError | DelegateResponseError
    > = res.data;
    return result;
  }

  public async forgingStatus(
    publicKey: string
  ): Promise<ApiResult<ForgingStatus, ValidationError | ForgingError>> {
    const params = {
      publicKey: publicKey,
    };
    const res = await this.base.get('/api/delegates/forging/status', params);
    const result: ApiResult<ForgingStatus, ValidationError | ForgingError> =
      res.data;
    return result;
  }

  public async search(
    addressOrPartialUsername: string,
    offset?: number,
    limit?: number
  ): Promise<
    ApiResult<DelegatesWrapperSimple, ValidationError | DelegateResponseError>
  > {
    const params = {
      searchFor: addressOrPartialUsername,
      offset: offset,
      limit: limit,
    };

    const res = await this.base.get('/api/delegates/search', params);
    const result: ApiResult<
      DelegatesWrapperSimple,
      ValidationError | DelegateResponseError
    > = res.data;
    return result;
  }
}
