import { ILogger, BufferList } from '@gny/interfaces';
import * as PeerInfo from 'peer-info';
import * as PeerId from 'peer-id';

export type AsyncMapFuncCallback = (
  err: Error,
  result?: String | Buffer
) => void;
export type AsyncMapFuncType = (
  data: Buffer,
  cb: AsyncMapFuncCallback
) => Promise<void>;

export type SimplePushTypeCallback = (err: Error, values: BufferList) => void;

export function attachEventHandlers(bundle, logger: ILogger) {
  const errorCallback = function(err: Error) {
    logger.error(
      `[p2p] Error: ${err} for node: ${bundle.peerId.toB58String()}`
    );
    if (
      err &&
      typeof err.message === 'string' &&
      err.message.includes('EADDRINUSE')
    ) {
      logger.warn('[p2p] port is already in use, shutting down...');
      throw err;
    }
  };

  const peerDiscoveryCallback = async function(peer: PeerId) {
    console.log(
      `[p2p] "peer:discovery" added peer to peerStor ${peer.toB58String()}`
    );
  };

  const peerConnectedCallback = function(connection) {
    logger.info(
      `[p2p] node ${bundle.peerId.toB58String()} connected with ${connection.localPeer.toB58String()}`
    );
  };

  const peerDisconnectCallback = function(connection) {
    logger.info(
      `[p2p] node ${
        bundle.peerId
      } got disconnected from ${connection.localPeer.toB58String()}`
    );
  };

  bundle.on('error', errorCallback);
  bundle.on('peer:discovery', peerDiscoveryCallback);
  bundle.connectionManager.on('peer:connect', peerConnectedCallback);
  bundle.connectionManager.on('peer:disconnect', peerDisconnectCallback);
}
