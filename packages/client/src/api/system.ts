import { Base } from './base';
import { ApiResult, VersionWrapper, ServerError } from '@gny/interfaces';
export class System extends Base {
  public async getSystemInfo() {
    const res = await this.get('/api/system');
    const result: ApiResult<VersionWrapper, ServerError> = res.data;
    return result;
  }
}
