import { Base } from './base';
import { ApiResult, VersionWrapper, ServerError } from '@gny/interfaces';
import { Connection } from '../connection';

export class System {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getSystemInfo() {
    const res = await this.base.get('/api/system');
    const result: ApiResult<VersionWrapper, ServerError> = res.data;
    return result;
  }
}
