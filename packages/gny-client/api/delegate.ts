import { Basic } from './basic';
import { Secret } from 'dockerode';

export class Delegate extends Basic {
  public async count() {
    return await this.get('/api/delegates/count');
  }

  public async getVoters(username: string) {
    const params = {
      username: username,
    };
    return await this.get('/api/delegates/getVoters', params);
  }

  public async getDelegateByPubKey(publicKey: string) {
    const params = {
      publicKey: publicKey,
    };
    return await this.get('/api/get', params);
  }

  public async getDelegateByUnsername(username: string) {
    const params = {
      username: username,
    };
    return await this.get('/api/get', params);
  }

  public async getDelegateByAddress(address: string) {
    const params = {
      address: address,
    };
    return await this.get('/api/get', params);
  }

  public async getDelegates(offset?: string, limit?: string) {
    const params = {
      offset: offset,
      limit: limit,
    };
    return await this.get('/api/delegates', params);
  }

  public async forgingEnable(secret: string, pulicKey: string) {
    const params = {
      secret: secret,
      pulicKey: pulicKey,
    };
    return await this.get('/api/delegates/forging/enable', params);
  }

  public async forgingDisable(secret: string, pulicKey: string) {
    const params = {
      secret: secret,
      pulicKey: pulicKey,
    };
    return await this.get('/api/delegates/forging/disable', params);
  }

  public async forgingStatus(pulicKey: string) {
    const params = {
      pulicKey: pulicKey,
    };
    return await this.get('/api/delegates/forging/status', params);
  }
}
