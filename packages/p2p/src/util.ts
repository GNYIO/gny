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

export function sendNewBlockQuery(
  peerInfo: PeerInfo,
  newBlockIdQuery: BlockIdWrapper,
  bundle: Bundle,
  logger: ILogger
) {
  return new Promise((resolve, reject) => {
    logger.info(
      `[p2p] dialing protocol "/v1/newBlock" for "${peerInfo.id.toB58String()}"`
    );
    bundle.dialProtocol(peerInfo, '/v1/newBlock', function(
      err: Error,
      conn: LibP2pConnection
    ) {
      if (err) {
        logger.info(`[p2p] dialProtocol "/v1/newBlock" failed for peer ...`);
        logger.err(err);

        return reject(new Error('failed for peer'));
      }

      const data = global.library.protobuf.encodeNewBlockIdQuery(
        newBlockIdQuery
      );

      pull(
        pull.values([data]),
        conn,
        pull.collect((err: Error, data: Buffer[]) => {
          const dataParsed: BlockAndVotes = JSON.parse(data[0].toString());
          logger.info(`[p2p] collect ${JSON.stringify(dataParsed)}`);

          // TODO: transform data -> BlockIdResult
          resolve(dataParsed);
        })
      );
    });
  });
}

export function attachCommunications(
  bundle: Bundle,
  logger: ILogger,
  StateHelper
) {
  bundle.handle('/v1/newBlock', function(
    protocol: string,
    conn: LibP2pConnection
  ) {
    pull(
      conn,
      // pull.collect((err, values: Buffer[]) => {
      //   logger.log(`[p2p] received buffer: ${JSON.stringify(values)}`);
      // }),
      pull.asyncMap(async (data, cb) => {
        const body = global.library.protobuf.decodeNewBlockIdQuery(data);
        console.log(`[p2p] body: ${JSON.stringify(body, null, 2)}`);

        const newBlock = await StateHelper.GetBlockFromLatestBlockCache(
          body.id
        );
        if (!newBlock) {
          return cb(new Error('New block not found'));
        }

        const result: ApiResult<NewBlockWrapper> = {
          success: true,
          block: newBlock.block,
          votes: newBlock.votes,
        };

        return cb(null, JSON.stringify(result));
      }),
      conn
    );
  });
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
        bundle.dial(multiAddrs, err => {
          if (err) {
            logger.info(
              `[p2p] Error: (${err}) while dialing new member ${multiAddrs}`
            );
          }
        });
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

  const peerDiscoveryCallback = function(peer: PeerInfo) {
    const allConnectedPeers = bundle.getAllConnectedPeers().map(x => x.id.id);
    // stop dialing peer if he is in the peerBook and we have an active connection
    if (
      bundle.peerBook.has(peer) &&
      allConnectedPeers.includes(peer.id.toB58String())
    ) {
      return;
    }

    logger.info(
      `[p2p] node ${getB58String(bundle.peerInfo)} has ${getB58String(
        peer
      )} not in peerBook. dialing peer now.`
    );
    bundle.dial(peer, (err: Error) => {
      if (err) {
        logger.info(
          `[p2p] dialing from ${getB58String(
            bundle.peerInfo
          )} to ${getB58String(peer)} failed. Error: ${err}`
        );
      }
    });
  };

  const peerConnectedCallback = function(peer: PeerInfo) {
    logger.info(
      `[p2p] node ${getB58String(
        bundle.peerInfo
      )} connected with ${getB58String(peer)}`
    );
    if (!bundle.peerBook.has(peer)) {
      logger.warn(
        `[p2p] node ${getB58String(
          bundle.peerInfo
        )} connected with peer ${getB58String(
          peer
        )}. BUT they are not connected!`
      );
      // dial to peer
    }

    const multiaddr = getMultiAddrsThatIsNotLocalAddress(peer);
    logger.info(
      `[p2p] after "peer:connect" we let other peers know of new member: ${multiaddr}`
    );
    bundle.pubsub.publish('newMember', Buffer.from(multiaddr.toString()));
  };

  const peerDisconnectCallback = function(peer) {
    logger.info(
      `[p2p] node ${getB58String(
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
