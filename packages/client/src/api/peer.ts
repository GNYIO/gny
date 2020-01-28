import { Base } from './base';
import {
  ApiResult,
  PeersWrapper,
  VersionWrapper,
  PeerInfoWrapper,
} from '@gny/interfaces';
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

  public async getInfo() {
    const res = await this.get('/api/peers/info');
    const result: ApiResult<PeerInfoWrapper> = res.data;
    return result;
  }
}
