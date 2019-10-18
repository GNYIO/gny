import { Base } from './base';

export class Loader extends Base {
  public async getStatus() {
    return await this.get('/api/loader/status');
  }

  public async syncStatus() {
    return await this.get('/api/loader/status/sync');
  }
}
