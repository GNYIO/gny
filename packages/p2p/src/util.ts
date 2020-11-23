import * as Multiaddr from 'multiaddr';
import { PeerNode, ILogger, P2PMessage } from '@gny/interfaces';
import { Wrapper } from './wrapper';
import * as PeerInfo from 'peer-info';
import * as PeerId from 'peer-id';

export function extractIpAndPort(peerInfo): PeerNode {
  let result: PeerNode = undefined;

  const arr = peerInfo.multiaddrs.toArray();
  for (let i = 0; i < arr.length; ++i) {
    const one = arr[i];
    const multi = Multiaddr(one);
    // checking if not 127.0.0.1 is a workaround
    // see https://github.com/libp2p/js-libp2p-floodsub/issues/58

    // issue #255
    const ipAddress = multi.toString().split('/')[2];
    if (multi.toString().includes('tcp') && multi.toString().includes('ip4')) {
      const y = multi.nodeAddress();
      result = {
        host: y.address,
        port: Number(y.port),
      };
      break;
    }
  }
  return result;
}

export function getB58String(peerInfo: PeerInfo) {
  const b58String = peerInfo.id.toB58String();
  return b58String;
}

export type AsyncMapFuncCallback = (
  err: Error,
  result?: String | Buffer
) => void;
export type AsyncMapFuncType = (
  data: Buffer,
  cb: AsyncMapFuncCallback
) => Promise<void>;

export type SimplePushTypeCallback = (err: Error, values: Buffer[]) => void;

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
    const connectedPeers = Array.from(bundle.connections.keys());
    const result = connectedPeers.find(x => x === peer.toB58String());
    if (!result) {
      try {
        await bundle.dial(peer);
      } catch (err) {
        logger.info(`[p2p] DIAL failed for peer: ${getB58String(peer)}`);
      }
    }

    // say "hello" to every peer in the network
    await bundle.broadcastHelloAsync();
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

export function getMultiAddrsThatIsNotLocalAddress(peerInfo: PeerInfo) {
  const result = peerInfo.multiaddrs.toArray().filter(multi => {
    if (
      multi.toString().includes('tcp') &&
      multi.toString().includes('ip4') &&
      !multi.toString().includes('127.0.0.1')
    ) {
      return true;
    }
    return false;
  });
  if (result.length === 0) {
    throw new Error('no valid multiaddrs provided');
  }

  return result[0];
}
