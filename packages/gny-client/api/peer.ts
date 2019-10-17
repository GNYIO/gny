import { Base } from './base';

export class Peer extends Base {
  public async getPeers() {
    return await this.get('/api/peers');
  }

  public async getVersion() {
    return await this.get('/api/peers/version');
  }
}
