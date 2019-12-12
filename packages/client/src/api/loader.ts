import { Base } from './base';
import { ApiResult, LoaderStatus, SyncStatus } from '@gny/interfaces';
export class Loader extends Base {
  public async getStatus() {
    const res = await this.get('/api/loader/status');
    const result: ApiResult<LoaderStatus> = res.data;
    return result;
  }

  public async syncStatus() {
    const res = await this.get('/api/loader/status/sync');
    const result: ApiResult<SyncStatus> = res.data;
    return result;
  }
}
