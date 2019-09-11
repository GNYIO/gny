import { Basic } from './basic';

export class System extends Basic {
  public async getSystemInfo() {
    return await this.get('/api/system');
  }
}
