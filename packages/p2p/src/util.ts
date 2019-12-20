import * as Multiaddr from 'multiaddr';
import { PeerNode, ILogger, P2PMessage } from '@gny/interfaces';
import { Bundle } from './bundle';
import * as PeerInfo from 'peer-info';

export function extractIpAndPort(peerInfo): PeerNode {
  let result: PeerNode = undefined;

  const arr = peerInfo.multiaddrs.toArray();
  for (let i = 0; i < arr.length; ++i) {
    const one = arr[i];
    const multi = Multiaddr(one);
    // checking if not 127.0.0.1 is a workaround
    // see https://github.com/libp2p/js-libp2p-floodsub/issues/58
    if (
      multi.toString().includes('tcp') &&
      multi.toString().includes('ip4') &&
      !multi.toString().includes('127.0.0.1')
    ) {
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

export function attachEventHandlers(bundle: Bundle, logger: ILogger) {
  const startCallback = function() {
    logger.info(`[p2p] start callback: ${getB58String(bundle.peerInfo)}`);

    // subscribe after we started
    bundle.pubsub.subscribe(
      'newMember',
      (message: P2PMessage) => {
        logger.info(
          `[p2p] pubsub event "newMember" fired, new member is: ${message.data.toString()}, (self ${getB58String(
            bundle.peerInfo
          )})`
        );
        const multiAddrs: any = Multiaddr(message.data.toString());

        // don't dial yourself if peer heard about you
        logger.info(
          `message.from: ${
            message.from
          } === self: ${bundle.peerInfo.id.toB58String()}`
        );
        if (message.from === bundle.peerInfo.id.toB58String()) {
          return;
        }
        bundle.dial(multiAddrs, err => {
          logger.info(`[p2] dialing new member: ${multiAddrs}`);
        });
      },
      () => {}
    );
  };
  const stopCallback = function() {
    logger.info(`stopped node: ${getB58String(bundle.peerInfo)}`);
  };
  const errorCallback = function(err: Error) {
    logger.error(
      `error "${err.message}" for node: ${getB58String(bundle.peerInfo)}`
    );
    if (typeof err.message === 'string' && err.message.includes('EADDRINUSE')) {
      logger.warn('port is already in use, shutting down...');
      throw err;
    }
  };
  const peerDiscoveryCallback = function(peer) {
    if (!bundle.peerBook.has(peer)) {
      logger.info(
        `node ${getB58String(bundle.peerInfo)} discovered ${getB58String(peer)}`
      );
      logger.info(`peer-discovered: ${JSON.stringify(peer, null, 2)}`);
    }
  };
  const peerConnectedCallback = function(peer: PeerInfo) {
    logger.info(
      `node ${getB58String(bundle.peerInfo)} connected with ${getB58String(
        peer
      )}`
    );

    const multiaddr = getMultiAddrsThatIsNotLocalAddress(peer);
    logger.info(
      `[p2p] after "peer:connect" we let other peers know of new member: ${multiaddr}`
    );
    bundle.pubsub.publish('newMember', Buffer.from(multiaddr.toString()));
  };
  const peerDisconnectCallback = function(peer) {
    logger.info(
      `node ${getB58String(
        bundle.peerInfo
      )} got disconnected from ${getB58String(peer)}`
    );
  };

  bundle.on('start', startCallback);
  bundle.on('stop', stopCallback);
  bundle.on('error', errorCallback);
  bundle.on('peer:discovery', peerDiscoveryCallback);
  bundle.on('peer:connect', peerConnectedCallback);
  bundle.on('peer:disconnect', peerDisconnectCallback);
}

export function printOwnPeerInfo(bundle: Bundle, logger: ILogger) {
  let addresses = '';
  bundle.peerInfo.multiaddrs.forEach(
    adr => (addresses += `\t${adr.toString()}\n`)
  );
  bundle.logger.info(
    `\n[P2P] started node: ${bundle.peerInfo.id.toB58String()}\n${addresses}`
  );
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
