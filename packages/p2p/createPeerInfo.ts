
import * as  PeerInfo from 'peer-info';
import * as PeerId from 'peer-id';
import { promisify } from 'util';

function _createPeerInfo (cb) {
  PeerInfo.create(cb);
}

function _createPeerInfoArgs (id, cb) {
  PeerInfo.create(id, cb);
}

function _createFromJSON(data, cb) {
  PeerId.createFromJSON(data, cb);
}


export function createPeerInfo() {
  return promisify(_createPeerInfo)();
}

export function createPeerInfoArgs(id) {
  return promisify(_createPeerInfoArgs)(id);
}

export function createFromJSON(data) {
  return promisify(_createFromJSON)(data);
}
