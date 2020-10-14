import * as libp2p from 'libp2p';
import {
  extractIpAndPort,
  AsyncMapFuncType,
  getB58String,
  SimplePushTypeCallback,
} from './util';
import {
  ILogger,
  P2PMessage,
  P2PSubscribeHandler,
  SimplePeerInfo,
  PeerInfoWrapper,
  ApiResult,
  NewBlockWrapper,
  BlockAndVotes,
  BlockIdWrapper,
} from '@gny/interfaces';
const Mplex = require('libp2p-mplex');
const SECIO = require('libp2p-secio');
const Bootstrap = require('libp2p-bootstrap');
const GossipSub = require('libp2p-gossipsub');
const TCP = require('libp2p-tcp');
const DHT = require('libp2p-kad-dht');
const defaultsDeep = require('@nodeutils/defaults-deep');
import * as PeerId from 'peer-id';

import { Options as LibP2POptions } from 'libp2p';
export { Options as LibP2POptions } from 'libp2p';
import { cloneDeep } from 'lodash';
const pull = require('pull-stream');
import {
  V1_BROADCAST_NEW_BLOCK_HEADER,
  V1_BROADCAST_TRANSACTION,
  V1_BROADCAST_PROPOSE,
  V1_BROADCAST_HELLO,
} from './protocols';

export class Bundle extends libp2p {
  public logger: ILogger;

  constructor(_options, logger: ILogger) {
    // input validation
    if (!Array.isArray(_options.config.peerDiscovery.bootstrap.list))
      throw new Error('bootstrapNode must be array');
    if (_options.config.peerDiscovery.bootstrap.list.includes(undefined))
      throw new Error('no undefined in string[]');
    if (_options.config.peerDiscovery.bootstrap.list.includes(null))
      throw new Error('no null in string[]');

    const defaults: Partial<LibP2POptions> = {
      switch: {
        denyTTL: 1,
        denyAttempts: Infinity,
      },
      connectionManager: {
        // this plays into the option autoDial: true
        // link: https://github.com/libp2p/js-libp2p/blob/master/PEER_DISCOVERY.md
        maxPeers: 100 * 1000,
        minPeers: 10 * 1000,
      },
      modules: {
        transport: [TCP],
        streamMuxer: [Mplex],
        connEncryption: [SECIO],
        peerDiscovery: [Bootstrap],
        dht: DHT,
        pubsub: GossipSub,
      },
      config: {
        peerDiscovery: {
          autoDial: false,
          bootstrap: {
            interval: 5000,
            enabled: true,
            list: [],
          },
        },
        relay: {
          enabled: false,
        },
        dht: {
          kBucketSize: 20,
          enabled: true,
          randomWalk: {
            enabled: false,
          },
        },
        pubsub: {
          enabled: true,
          emitSelf: false,
        },
      },
    };
    const finalConfig = defaultsDeep(_options, defaults);
    super(finalConfig);

    this.logger = logger;
  }

  public async broadcastHelloAsync() {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_HELLO, Buffer.from('hello'));
  }

  public async broadcastProposeAsync(data: Buffer) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_PROPOSE, data);
  }

  public async broadcastTransactionAsync(data: Buffer) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_TRANSACTION, data);
  }

  public async broadcastNewBlockHeaderAsync(data: Buffer) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_NEW_BLOCK_HEADER, data);
  }

  public async broadcastAsync(topic: string, data: Buffer): Promise<void> {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(topic, data);
  }

  public getConnectedRandomNode() {
    const allConnectedPeers = this.getAllConnectedPeers();
    if (allConnectedPeers.length > 0) {
      const index = Math.floor(Math.random() * allConnectedPeers.length);
      const result = allConnectedPeers[index];
      this.logger.info(
        `[p2p] getConnectedRandomNode: ${result.id.id}; ${JSON.stringify(
          result.simple
        )}`
      );
      return result.simple;
    }
    return undefined;
  }

  subscribeCustom(topic: string, handler: P2PSubscribeHandler) {
    this.logger.info(`[p2p] subscribe to topic "${topic}"`);

    const filterBroadcastsEventHandler = (message: P2PMessage) => {
      const id = PeerId.createFromB58String(message.from);
      this.peerRouting.findPeer(id, {}, (err, result: PeerInfo) => {
        // find peer in routing table that broadcasted message
        if (err) {
          this.logger.warn(
            '[p2p] could not find peer that broadcasted message'
          );
          return;
        }

        const finish = peerToAttach => {
          const extendedMsg: P2PMessage = {
            ...message,
            peerInfo: extractIpAndPort(peerToAttach),
          };
          handler(extendedMsg);
        };

        finish(result);
      });
    };

    this.pubsub.subscribe(topic, filterBroadcastsEventHandler, () => {});
  }

  getAllConnectedPeers() {
    const result: SimplePeerInfo[] = [];
    const copy = cloneDeep(
      this.peerBook.getAllArray().filter(x => x.isConnected())
    );
    copy.forEach(one => {
      const onePeerWithSimplePort: SimplePeerInfo = {
        id: {
          id: one.id.toJSON().id,
          pubKey: one.id.toJSON().pubKey,
        },
        multiaddrs: one.multiaddrs.toArray().map(x => x.toString()),
        simple: extractIpAndPort(one),
      };
      result.push(onePeerWithSimplePort);
    });

    return result;
  }

  info() {
    const result: Pick<PeerInfoWrapper, 'id' | 'multiaddrs'> = {
      id: this.peerInfo.id.toB58String(),
      multiaddrs: this.peerInfo.multiaddrs.toArray().map(x => x.toString()),
    };
    return result;
  }

  public findPeerInfoInDHT(
    p2pMessage: Pick<P2PMessage, 'from'>
  ): Promise<PeerInfo> {
    const { from } = p2pMessage;
    const id = PeerId.createFromB58String(from);

    return new Promise((resolve, reject) => {
      this.peerRouting.findPeer(id, {}, (err, result: PeerInfo) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  }

  public async directRequest(
    peerInfo: PeerInfo,
    protocol: string,
    data: string
  ): Promise<Buffer> {
    this.logger.info(
      `[p2p] dialing protocol "${protocol}" from ${this.peerInfo.id.toB58String()} -> ${peerInfo.id.toB58String()}`
    );

    return new Promise((resolve, reject) => {
      this.logger.info(
        `[p2p] start to dial protocol "${protocol}" -> peer ${getB58String(
          peerInfo
        )}`
      );
      this.dialProtocol(peerInfo, protocol, function(err: Error, conn) {
        if (err) {
          this.logger.error(
            `[p2p] failed dialing protocol "${protocol}" to "${peerInfo.id.toB58String()}`
          );
          this.logger.error(err);
          return reject(err);
        }

        pull(
          pull.values([data]),
          conn,
          pull.collect((err: Error, returnedData: Buffer[]) => {
            if (err) {
              this.logger.error(
                `[p2p] response from protocol dial "${protocol}" failed. Dialing was ${this.peerInfo.id.toB58String()} -> ${peerInfo.id.toB58String()}`
              );
              return reject(err);
            }

            return resolve(returnedData[0]);
          })
        );
      });
    });
  }

  // no duplex (only onedirectional)
  public async pushOnly(peerInfo: PeerInfo, protocol: string, data: string) {
    this.logger.info(
      `[p2p] pushOnly "${protocol}" from ${this.peerInfo.id.toB58String()} -> ${peerInfo.id.toB58String()}`
    );

    return new Promise((resolve, reject) => {
      try {
        this.dialProtocol(peerInfo, protocol, function(err: Error, conn) {
          if (err) {
            this.logger.error(`[p2p] pushOnly did not work: ${err.message}`);
            this.logger.error(err);
            return;
          }

          pull(pull.values([data]), conn);
          resolve();
        });
      } catch (err) {
        this.logger.error(err.message);
        this.logger.error(err);
        reject(err);
      }
    });
  }

  public directResponse(protocol: string, func: AsyncMapFuncType) {
    this.logger.info(`[p2p] attach protocol "${protocol}"`);

    this.handle(protocol, function(protocol: string, conn) {
      pull(conn, pull.asyncMap(func), conn);
    });
  }

  public handlePushOnly(protocol: string, cb: SimplePushTypeCallback) {
    this.handle(protocol, function(protocol: string, conn) {
      try {
        pull(conn, pull.collect(cb));
      } catch (err) {
        this.logger.error(`[p2p] handlePushOnly error: ${err.message}`);
        this.logger.error(err);
      }
    });
  }
}
