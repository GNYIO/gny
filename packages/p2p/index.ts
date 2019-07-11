import { Bundle } from './bundle';
import * as PeerId from 'peer-id';
import { extractIpAndPort } from './util';
import {
  P2PMessage,
  ILogger,
  P2PSubscribeHandler,
  PeerNode,
} from '../../src/interfaces';

export class Peer2Peer {
  private bundle: Bundle;
  private logger: ILogger;

  public isStarted = () => {
    return this.bundle.isStarted();
  };
  get peerInfo(): PeerInfo {
    return this.bundle.peerInfo;
  }
  get peerBook(): PeerBook {
    return this.bundle.peerBook;
  }

  constructor(
    logger: ILogger,
    peerInfo: PeerInfo,
    bootstrapNode: string,
    bootStrapInterval: number = 5000
  ) {
    this.logger = logger;

    const configuration = {
      peerInfo,
      config: {
        peerDiscovery: {
          bootstrap: {
            list: bootstrapNode ? [bootstrapNode] : [],
            interval: bootStrapInterval,
          },
        },
      },
    };

    this.bundle = new Bundle(configuration);
  }

  public startAsync = async () => {
    this.bundle.on('stop', this.stopped);
    this.bundle.on('error', this.errorOccurred);
    this.bundle.on('peer:connect', this.peerConnect);
    this.bundle.on('peer:disconnect', this.peerDisconnect);
    this.bundle.on('peer:discovery', this.peerDiscovery);
    await this.bundle.startAsync();
    this.printOwnPeerInfo();
  };

  public stopAsync = async () => {
    await this.bundle.stopAsync();
  };

  private printOwnPeerInfo = () => {
    let addresses = '';
    this.peerInfo.multiaddrs.forEach(
      adr => (addresses += `\t${adr.toString()}\n`)
    );
    this.logger.info(
      `\n[P2P] started node: ${this.peerInfo.id.toB58String()}\n${addresses}`
    );
  };

  private stopped = err => {
    this.logger.info('[P2P] p2p node stopped');
  };

  private errorOccurred = err => {
    this.logger.error(`[P2P] error occurred: ${err.message}`);
    if (typeof err.message === 'string' && err.message.includes('EADDRINUSE')) {
      this.logger.warn('port is already in use, shutting down...');
      throw new Error(err);
    }
  };

  public stop = cb => {
    this.bundle.stop(cb);
  };

  subscribe(topic: string, handler: P2PSubscribeHandler) {
    const filterBroadcastsEventHandler = (message: P2PMessage) => {
      // this filters messages out which are published from the own node
      if (message.from === this.peerInfo.id.toB58String()) {
        return;
      }

      const id = PeerId.createFromB58String(message.from);
      this.bundle.peerRouting.findPeer(id, {}, (err, result) => {
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

        this.bundle.dial(result, erro => {
          // dial to peer that broadcasted message
          if (erro) {
            this.logger.warn(`could not dial peer ${id}`);
            return;
          }
          return finish(result);
        });
      });
    };

    this.bundle.pubsub.subscribe(topic, filterBroadcastsEventHandler, () => {});
  }

  broadcastProposeAsync(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bundle.isStarted()) {
        resolve();
      }
      this.bundle.pubsub.publish('propose', data, err => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  public broadcastTransactionAsync(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bundle.isStarted()) {
        resolve();
      }
      this.bundle.pubsub.publish('transaction', data, err => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  public broadcastNewBlockHeaderAsync(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bundle.isStarted()) {
        resolve();
      }
      this.bundle.pubsub.publish('newBlockHeader', data, err => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  broadcastAsync(topic: string, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bundle.isStarted()) {
        resolve();
      }
      this.bundle.pubsub.publish(topic, data, err => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  private peerConnect = peer => {
    this.logger.info(`[P2P] peer:connect:${peer.id.toB58String()}`);
  };

  private peerDisconnect = peer => {
    this.logger.info(`[P2P] peer:disconnect:${peer.id.toB58String()}`);
    this.bundle.peerBook.remove(peer);
  };

  private peerDiscovery = async peer => {
    // when peer is discovered by DHT
    // do not spam log output: the bootstrap mechanism tries every x seconds to connect to the bootstrap node(s)
    if (!this.bundle.peerBook.has(peer)) {
      this.logger.info(`[P2P] discovered peer: ${peer.id.toB58String()}`);
    }
    if (!this.bundle.isStarted()) {
      this.logger.warn(
        `[P2P] own node not started, can not dial to peer: ${peer.id.toB58String()}`
      );
      return;
    }
    try {
      // this action establishes a __Connection__ to the newly discovered peer
      // this also adds the peer to the peerBook so the pubsub mechanism can publish to this peer
      await this.bundle.dialAsync(peer);
    } catch (err) {
      this.logger.info(`[P2P] could not dial to ${peer.id.toB58String()}`);
    }
  };

  public getRandomNode = () => {
    const allPeers = this.peerBook.getAllArray();
    if (allPeers.length > 0) {
      const index = Math.floor(Math.random() * allPeers.length);
      const peerInfo = allPeers[index];
      const extracted = extractIpAndPort(peerInfo);
      this.logger.info(
        `[P2P] getRandomPeer: ${peerInfo.id.toB58String()}; ${JSON.stringify(
          extracted
        )}`
      );
      return extracted;
    }
    return undefined;
  };
}
