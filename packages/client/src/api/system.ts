import { Base } from './base';

export class System extends Base {
  public async getSystemInfo() {
    return await this.get('/api/system');
  }
}
