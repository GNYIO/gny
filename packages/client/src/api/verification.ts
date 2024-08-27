import { Base } from './base.js';
import {
  ApiResult,
  ValidationError,
  VerificationsWrapper,
  SingleVerificationWrapper,
} from '@gnyio/interfaces';
import { Connection } from '../connection.js';

export class Verification {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async get(
    identifier: string
  ): Promise<ApiResult<SingleVerificationWrapper, ValidationError | string>> {
    const params = {
      identifier: identifier,
    };

    const res = await this.base.get('/api/verification/get', params);
    const result: ApiResult<
      SingleVerificationWrapper,
      ValidationError | string
    > = res.data;
    return result;
  }

  public async getAll(
    limit: number,
    offset: number,
    senderId?: string
  ): Promise<ApiResult<VerificationsWrapper, ValidationError | string>> {
    const params = {
      limit: limit,
      offset: offset,
      senderId: senderId,
    };
    const res = await this.base.get('/api/verification/', params);
    const result: ApiResult<VerificationsWrapper, ValidationError | string> =
      res.data;
    return result;
  }
}
