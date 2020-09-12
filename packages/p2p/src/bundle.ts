import * as libp2p from 'libp2p';
import { extractIpAndPort, attachCommunications } from './util';
import {
  ILogger,
  P2PMessage,
  P2PSubscribeHandler,
  SimplePeerInfo,
  PeerInfoWrapper,
  ApiResult,
  NewBlockWrapper,
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
import * as pull from 'pull-stream';

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
        dialTimeout: 100, // number of ms a dial to a peer should be allowed to run. Defaults to 30 seconds (30 * 1000)
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
            interval: 1000,
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

  public async broadcastProposeAsync(data: Buffer) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish('propose', data);
  }

  public async broadcastTransactionAsync(data: Buffer) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish('transaction', data);
  }

  public async broadcastNewBlockHeaderAsync(data: Buffer) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish('newBlockHeader', data);
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

        this.dial(result, erro => {
          // dial to peer that broadcasted message
          if (erro) {
            this.logger.warn(`[p2p] could not dial peer ${id}`);
            return;
          }
          return finish(result);
        });
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

  findPeerAsync(id: PeerId): Promise<PeerInfo> {
    return new Promise((resolve, reject) => {
      this.peerRouting.findPeer(id, {}, (err, result: PeerInfo) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  }

  async requestLibp2p(
    peerInfo: PeerInfo,
    protocol: string,
    data: string
  ): Promise<Buffer> {
    this.logger.info(
      `[p2p] dialing protocol "${protocol}" from ${this.peerInfo.id.toB58String()} -> ${peerInfo.id.toB58String()}`
    );

    return new Promise((resolve, reject) => {
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

  private attachProtocol(
    protocol: string,
    func: (data: Buffer, cb) => Promise<void>
  ) {
    this.logger.info(`[p2p] attach protocol "${protocol}"`);

    this.handle(protocol, function(protocol: string, conn) {
      pull(conn, pull.asyncMap(func), conn);
    });
  }
}
