import { Base } from './base';
import {
  ApiResult,
  PeersWrapper,
  VersionWrapper,
  PeerInfoWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

export class Peer {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }
  public async getPeers() {
    const res = await this.base.get('/api/peers');
    const result: ApiResult<PeersWrapper> = res.data;
    return result;
  }

  public async getVersion() {
    const res = await this.base.get('/api/peers/version');
    const result: ApiResult<VersionWrapper> = res.data;
    return result;
  }

  public async getInfo() {
    const res = await this.base.get('/api/peers/info');
    const result: ApiResult<PeerInfoWrapper> = res.data;
    return result;
  }
}
