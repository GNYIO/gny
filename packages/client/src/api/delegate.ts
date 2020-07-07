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
  DelegatesWrapper,
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

  public async count() {
    const res = await this.base.get('/api/delegates/count');
    const result: ApiResult<CountWrapper, DelegateResponseError> = res.data;
    return result;
  }

  public async getVoters(username: string) {
    const params = {
      username: username,
    };
    const res = await this.base.get('/api/delegates/getVoters', params);
    const result: ApiResult<AccountsWrapper, ValidationError | ServerError> =
      res.data;
    return result;
  }

  public async getOwnVotes(params: DelegateAddressOrUsername) {
    const res = await this.base.get('/api/delegates/getOwnVotes', params);
    const result: ApiResult<
      SimpleAccountsWrapper,
      ValidationError | ServerError
    > = res.data;
    return result;
  }

  public async getDelegateByPubKey(publicKey: string) {
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

  public async getDelegateByUsername(username: string) {
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

  public async getDelegateByAddress(address: string) {
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

  public async ownProducedBlocks(params: OwnProducedBlocksQuery) {
    const res = await this.base.get('/api/delegates/ownProducedBlocks', params);
    const result: ApiResult<DelegateOwnProducedBlocks, ValidationError> =
      res.data;
    return result;
  }

  public async getDelegates(offset?: string, limit?: string) {
    const params = {
      offset: offset,
      limit: limit,
    };
    const res = await this.base.get('/api/delegates', params);
    const result: ApiResult<
      DelegatesWrapper,
      ValidationError | DelegateResponseError
    > = res.data;
    return result;
  }

  public async forgingEnable(secret: string, pulicKey: string) {
    const params = {
      secret: secret,
      pulicKey: pulicKey,
    };
    const res = await this.base.get('/api/delegates/forging/enable', params);
    const result: ApiResult<any, ValidationError | ForgingError> = res.data;
    return result;
  }

  public async forgingDisable(secret: string, pulicKey: string) {
    const params = {
      secret: secret,
      pulicKey: pulicKey,
    };
    const res = await this.base.get('/api/delegates/forging/disable', params);
    const result: ApiResult<any, ValidationError | ForgingError> = res.data;
    return result;
  }

  public async forgingStatus(publicKey: string) {
    const params = {
      publicKey: publicKey,
    };
    const res = await this.base.get('/api/delegates/forging/status', params);
    const result: ApiResult<ForgingStatus, ValidationError | ForgingError> =
      res.data;
    return result;
  }
}
