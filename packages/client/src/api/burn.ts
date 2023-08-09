import { Base } from './base';
import { ApiResult, ValidationError, BurnWrapper } from '@gny/interfaces';
import { Connection } from '../connection';

export class Burn {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getAll(
    limit?: number,
    offset?: number,
    senderId?: string
  ): Promise<ApiResult<BurnWrapper, ValidationError | string>> {
    const params = {
      limit: limit,
      offset: offset,
      senderId: senderId,
    };
    const res = await this.base.get('/api/burn/', params);
    const result: ApiResult<BurnWrapper, ValidationError | string> = res.data;
    return result;
  }
}
