import { Basic } from './basic';

export class Loader extends Basic {
  public async getStatus() {
    return await this.get('/api/loader/status');
  }

  public async syncStatus() {
    return await this.get('/api/loader/status/sync');
  }
}
