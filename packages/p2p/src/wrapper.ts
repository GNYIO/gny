import {
  extractIpAndPort,
  AsyncMapFuncType,
  SimplePushTypeCallback,
} from './util';
import {
  ILogger,
  P2PMessage,
  P2PSubscribeHandler,
  SimplePeerInfo,
  PeerInfoWrapper,
} from '@gny/interfaces';
import { attachEventHandlers } from './util';

const Bootstrap = require('libp2p-bootstrap');
import * as Libp2p from 'libp2p';
const TCP = require('libp2p-tcp');
const mplex = require('libp2p-mplex');
const SECIO = require('libp2p-secio');
const { NOISE } = require('libp2p-noise');
const Gossipsub = require('libp2p-gossipsub');
const DHT = require('libp2p-kad-dht');

import * as PeerId from 'peer-id';

import { cloneDeep } from 'lodash';
const pull = require('pull-stream');
import {
  V1_BROADCAST_NEW_BLOCK_HEADER,
  V1_BROADCAST_TRANSACTION,
  V1_BROADCAST_PROPOSE,
  V1_BROADCAST_HELLO,
  V1_BROADCAST_HELLO_BACK,
} from './protocols';

export class Wrapper extends Libp2p {
  public logger: ILogger;

  constructor(
    ip: string,
    port: number,
    peerId,
    bootstrap: string[],
    logger: ILogger
  ) {
    const options = {
      peerId: peerId,
      addresses: {
        listen: [`/ip4/${ip}/tcp/${port}`],
        announce: [`/ip4/${ip}/tcp/${port}`],
      },
      modules: {
        transport: [TCP],
        dht: DHT,
        pubsub: Gossipsub,
        streamMuxer: [mplex],
        connEncryption: [NOISE, SECIO],
      },
      config: {
        dialer: {
          maxDialsPerPeer: 1, // do not dial peers
          dialTimeout: 1000, // ms
        },
        peerDiscovery: {
          autoDial: false,
        },
        pubsub: {
          enabled: true,
          emitSelf: false,
          signMessages: true,
          strictSigning: true,
        },
        dht: {
          kBucketSize: 20,
          enabled: true,
          randomWalk: {
            enabled: false,
          },
        },
        relay: {
          enabled: false,
          hop: {
            enabled: true,
            active: true,
          },
        },
      },
    };

    if (bootstrap.length > 0) {
      options.modules.peerDiscovery = [Bootstrap];
      options.config.peerDiscover = {
        bootstrap: {
          interval: 10 * 1000,
          enabled: true,
          list: bootstrap,
        },
      };
    }

    super(options);
    this.logger = logger;
  }

  public async broadcastHelloAsync() {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_HELLO, Buffer.from('hello'));
  }

  public async broadcastHelloBackAsync() {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(
      V1_BROADCAST_HELLO_BACK,
      Buffer.from('hello back 2')
    );
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

  public getConnectedRandomNodePeerInfo() {
    const allConnectedPeersPeerInfo = this.getAllConnectedPeersPeerInfo();
    if (allConnectedPeersPeerInfo.length > 0) {
      const index = Math.floor(
        Math.random() * allConnectedPeersPeerInfo.length
      );
      const result = allConnectedPeersPeerInfo[index];
      this.logger.info(
        `[p2p] allConnectedPeersPeerInfo: ${result.id}; ${JSON.stringify(
          result
        )}`
      );
      return result;
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

  getAllConnectedPeersPeerInfo() {
    const connections: string[] = Array.from(this.connections.keys());

    const connectedPeerInfo = this.peer.peerStore.peers.forEach(
      (result, key) => {
        const has = connections.find(x => x === key);
        if (!has) {
          return;
        }

        const temp = {
          id: {
            id: result.id.toJSON().id,
            pubKey: result.id.toJSON().pubKey,
          },
          multiaddrs: result.addresses.map(
            x => `${x.multiaddr}/ipfs/${result.id.toJSON().id}`
          ),
          simple: {
            host: result.addresses[
              result.addresses.length - 1
            ].multiaddr.nodeAddress().address,
            port: result.addresses[
              result.addresses.length - 1
            ].multiaddr.nodeAddress().port,
          },
        };
        return temp;
      }
    );
    return connectedPeerInfo;
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
    peerId: PeerId,
    protocol: string,
    data: string
  ): Promise<Buffer> {
    this.logger.info(
      `[p2p] dialing protocol "${protocol}" from ${this.peerId.toB58String()} -> ${peerId.toB58String()}`
    );

    return new Promise((resolve, reject) => {
      this.logger.info(
        `[p2p] start to dial protocol "${protocol}" -> peer ${peerId.toB58String()}`
      );
      this.dialProtocol(peerId, protocol, (err: Error, conn) => {
        if (err) {
          this.logger.error(
            `[p2p] failed dialing protocol "${protocol}" to "${peerId.toB58String()}`
          );
          this.logger.error(err);
          return reject(err);
        }

        try {
          pull(
            pull.values([data]),
            conn,
            pull.collect((err: Error, returnedData: Buffer[]) => {
              if (err) {
                this.logger.error(
                  `[p2p] response from protocol dial "${protocol}" failed. Dialing was ${this.peerId.toB58String()} -> ${this.peerId.toB58String()}`
                );
                return reject(err);
              }

              const result = returnedData[0];
              if (!Buffer.isBuffer(result)) {
                return reject(new Error('returned value is not a Buffer'));
              }

              return resolve(result);
            })
          );
        } catch (err) {
          this.logger.error(
            `[p2p] (catching error) response from protocol dial "${protocol}" failed. Dialing was ${this.peerId.toB58String()} -> ${peerId.toB58String()}`
          );
          return reject(err);
        }
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
        this.dialProtocol(peerInfo, protocol, (err: Error, conn) => {
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
    this.logger.info(`[p2p] handle push only "${protocol}"`);
    this.handle(protocol, (protocol: string, conn) => {
      try {
        pull(conn, pull.collect(cb));
      } catch (err) {
        this.logger.error(`[p2p] handlePushOnly error: ${err.message}`);
        this.logger.error(err);
      }
    });
  }
}
