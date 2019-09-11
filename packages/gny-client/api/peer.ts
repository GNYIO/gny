import { Basic } from './basic';

export class Peer extends Basic {
  public async getPeers() {
    return await this.get('/api/peers');
  }

  public async getVersion() {
    return await this.get('/api/peers/version');
  }
}
