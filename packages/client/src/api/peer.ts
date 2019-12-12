import { Base } from './base';
import { ApiResult, PeersWrapper, VersionWrapper } from '@gny/interfaces';
export class Peer extends Base {
  public async getPeers() {
    const res = await this.get('/api/peers');
    const result: ApiResult<PeersWrapper> = res.data;
    return result;
  }

  public async getVersion() {
    const res = await this.get('/api/peers/version');
    const result: ApiResult<VersionWrapper> = res.data;
    return result;
  }
}
