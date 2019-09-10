const PeerInfo = require('peer-info');
const PeerId = require('peer-id');
import { promisify } from 'util';

function _createPeerInfo(cb: PeerInfo.CreateCb) {
  PeerInfo.create(cb);
}

function _createPeerInfoArgs(id, cb: PeerInfo.CreateCb) {
  PeerInfo.create(id, cb);
}

function _createFromJSON(data: PeerId.JSON, cb: PeerId.CreateCb) {
  PeerId.createFromJSON(data, cb);
}

export function createPeerInfo(): Promise<PeerInfo> {
  return promisify(_createPeerInfo)();
}

export function createPeerInfoArgs(id): Promise<PeerInfo> {
  return promisify(_createPeerInfoArgs)(id);
}

export function createFromJSON(data): Promise<PeerId> {
  return promisify(_createFromJSON)(data);
}
