import * as libp2p from 'libp2p';
import * as DHT from 'libp2p-kad-dht';
import { extractIpAndPort } from './util';
import { ILogger, P2PMessage, P2PSubscribeHandler } from '../../src/interfaces';
const Mplex = require('libp2p-mplex');
const SECIO = require('libp2p-secio');
const Bootstrap = require('libp2p-bootstrap');
const GossipSub = require('libp2p-gossipsub');
const TCP = require('libp2p-tcp');
const defaultsDeep = require('@nodeutils/defaults-deep');
import * as PeerId from 'peer-id';

export class Bundle extends libp2p {
  private logger: ILogger;

  constructor(_options, logger: ILogger) {
    const defaults = {
      connectionManager: {
        // this plays into the option autoDial: true
        // link:
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
          autoDial: true,
          bootstrap: {
            interval: 10 * 1000,
            enabled: true,
            list: [],
          },
        },
        relay: {
          enabled: true,
        },
        dht: {
          kBucketSize: 20,
          enabled: true,
          randomWalk: {
            enabled: true,
            interval: 300 * 1000,
            timeout: 10 * 1000,
          },
        },
        pubsub: {
          enabled: true,
        },
      },
    };
    const finalConfig = defaultsDeep(_options, defaults);
    console.log(`config: ${JSON.stringify(finalConfig, null, 2)}`);

    // input validation
    if (!Array.isArray(finalConfig.config.peerDiscovery.bootstrap.list))
      throw new Error('bootstrapNode must be array');
    if (finalConfig.config.peerDiscovery.bootstrap.list.includes(undefined))
      throw new Error('no undefined in string[]');
    if (finalConfig.config.peerDiscovery.bootstrap.list.includes(null))
      throw new Error('no null in string[]');

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

  public getRandomNode() {
    const allPeers = this.peerBook.getAllArray();
    if (allPeers.length > 0) {
      const index = Math.floor(Math.random() * allPeers.length);
      const peerInfo = allPeers[index];
      const extracted = extractIpAndPort(peerInfo);
      // this.logger.info(
      //   `[P2P] getRandomPeer: ${peerInfo.id.toB58String()}; ${JSON.stringify(
      //     extracted
      //   )}`
      // );
      return extracted;
    }
    return undefined;
  }

  subscribeCustom(topic: string, handler: P2PSubscribeHandler) {
    const filterBroadcastsEventHandler = (message: P2PMessage) => {
      // this filters messages out which are published from the own node
      if (message.from === this.peerInfo.id.toB58String()) {
        return;
      }

      const id = PeerId.createFromB58String(message.from);
      this.peerRouting.findPeer(id, {}, (err, result) => {
        // find peer in routing table that broadcasted message
        if (err) {
          this.logger.warn('could not find peer that broadcasted message');
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
            this.logger.warn(`could not dial peer ${id}`);
            return;
          }
          return finish(result);
        });
      });
    };

    this.pubsub.subscribe(topic, filterBroadcastsEventHandler, () => {});
  }
}
