import { Base } from './base';
import { ApiResult, LoaderStatus, SyncStatus } from '@gny/interfaces';
import { Connection } from '../connection';

export class Loader {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getStatus(): Promise<ApiResult<LoaderStatus>> {
    const res = await this.base.get('/api/loader/status');
    const result: ApiResult<LoaderStatus> = res.data;
    return result;
  }

  public async syncStatus(): Promise<ApiResult<SyncStatus>> {
    const res = await this.base.get('/api/loader/status/sync');
    const result: ApiResult<SyncStatus> = res.data;
    return result;
  }
}
