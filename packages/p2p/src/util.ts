import * as Multiaddr from 'multiaddr';
import {
  PeerNode,
  ILogger,
  P2PMessage,
  ApiResult,
  NewBlockWrapper,
  BlockIdWrapper,
  BlockAndVotes,
} from '@gny/interfaces';
import { Bundle } from './bundle';
import * as PeerInfo from 'peer-info';
import * as pull from 'pull-stream';
import { V1_NEW_BLOCK_PROTOCOL } from './protocols';

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

        logger.info(
          `[p2p] message.from: ${
            message.from
          } === self: ${bundle.peerInfo.id.toB58String()}`
        );

        // don't dial yourself if peer heard about you
        // test if newMember multiaddrs string (example /ipv/ipAddress/tcp/port/ipfs/id) includes my peerId
        if (
          Buffer.isBuffer(message.data) &&
          message.data.toString().includes(bundle.peerInfo.id.toB58String())
        ) {
          return;
        }
      },
      () => {}
    );
  };

  const stopCallback = function() {
    logger.info(`[p2p] stopped node: ${getB58String(bundle.peerInfo)}`);
  };

  const errorCallback = function(err: Error) {
    logger.error(
      `[p2p] Error: ${err} for node: ${getB58String(bundle.peerInfo)}`
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

  const peerDiscoveryCallback = async function(peer: PeerInfo) {
    try {
      logger.info(`[p2p] going to DIAL peer: ${getB58String(peer)}`);
      await bundle.dial(peer);
      logger.info(`[p2p] successfully DIALED peer: ${getB58String(peer)}`);
    } catch (err) {
      logger.info(`[p2p] DIAL failed for peer: ${getB58String(peer)}`);
    }

    // say "hello" to every in the network
    logger.info(`[p2p] say "hello" to all peers`);
    await bundle.broadcastHelloAsync();
    logger.info(`[p2p] said hello to all peers`);
  };

  const peerConnectedCallback = function(peer: PeerInfo) {
    logger.info(
      `[p2p] node ${getB58String(
        bundle.peerInfo
      )} connected with ${getB58String(peer)}`
    );
  };

  const peerDisconnectCallback = function(peer) {
    logger.info(
      `[p2p] node ${getB58String(
        bundle.peerInfo
      )} got disconnected from ${getB58String(peer)}`
    );
  };

  const connectionStartCallback = function(peer) {
    logger.info(
      `[p2p] node ${getB58String(
        bundle.peerInfo
      )} started connection with ${getB58String(peer)}`
    );
  };

  const connectionEndCallback = function(peer) {
    logger.info(
      `[p2p] node ${getB58String(
        bundle.peerInfo
      )} ended connection with ${getB58String(peer)}`
    );
  };

  bundle.on('start', startCallback);
  bundle.on('stop', stopCallback);
  bundle.on('error', errorCallback);
  bundle.on('peer:discovery', peerDiscoveryCallback);
  bundle.on('peer:connect', peerConnectedCallback);
  bundle.on('peer:disconnect', peerDisconnectCallback);
  bundle.on('connection:start', connectionStartCallback);
  bundle.on('connection:end', connectionEndCallback);
}

export function printOwnPeerInfo(bundle: Bundle, logger: ILogger) {
  let addresses = '';
  bundle.peerInfo.multiaddrs.forEach(
    adr => (addresses += `\t${adr.toString()}\n`)
  );
  bundle.logger.info(
    `[p2p] started node: ${bundle.peerInfo.id.toB58String()}\n${addresses}`
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
