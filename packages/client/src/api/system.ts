import { Base } from './base.js';
import { ApiResult, VersionWrapper, ServerError } from '@gnyio/interfaces';
import { Connection } from '../connection.js';

export class System {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getSystemInfo(): Promise<
    ApiResult<VersionWrapper, ServerError>
  > {
    const res = await this.base.get('/api/system');
    const result: ApiResult<VersionWrapper, ServerError> = res.data;
    return result;
  }
}
