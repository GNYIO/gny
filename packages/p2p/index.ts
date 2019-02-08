
import { Bundle } from './bundle';
import * as PeerId from 'peer-id';
import { extractIpAndPort } from './util';
import * as fs from 'fs';
import { createPeerInfoArgs, createFromJSON, } from './createPeerInfo';

export class Peer2Peer {
  private _bundle: Bundle;

  async start(ip: string, port: number, bootstrapNode: string) {
    let KEY = fs.readFileSync('./p2p_key.json', { encoding: 'utf8' });
    KEY = JSON.parse(KEY);
    const peerId = await createFromJSON(KEY);
    const peerInfo = await createPeerInfoArgs(peerId);
    const multi = `/ip4/${ip}/tcp/${port}`;
    peerInfo.multiaddrs.add(multi);

    const configuration = {
      peerInfo,
      config: {
        peerDiscovery: {
          bootstrap: {
            list: bootstrapNode ? [ bootstrapNode ] : [ undefined ],
          },
        },
      },
    };

    this._bundle = new Bundle(configuration);

    await this._bundle.startAsync();
    this._bundle.on('peer:connect', this.addPeerToDb);
    this._bundle.on('peer:disconnect', this.removePeerFromDb);
    this._bundle.on('peer:discovery', this.peerDiscovery);
  }

  subscribe (topic: string, handler: (message: string) => void) {
    const filterBroadcasts = (message) => {
      // this filters messages out which are published from the own node
      if (message.from === this._bundle.peerInfo.id.toB58String()) {
        return;
      }

      const id = PeerId.createFromB58String(message.from);
      this._bundle.peerRouting.findPeer(id, {}, (err, result) => { // find peer in routing table
        if (err) {
          throw new Error('could not find peer that broadcasted message');
        }

        const finish = (peerToAttach) => {
          message.peerInfo = extractIpAndPort(peerToAttach);
          handler(message);
        };

        this._bundle.dial(result, (erro, conn) => {
          return finish(result);
        });


      });
    };

    this._bundle.pubsub.subscribe(topic, filterBroadcasts, () => {});
  }

  broadcastProposeAsync(data): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._bundle.isStarted()) {
        resolve();
      }
      this._bundle.pubsub.publish('propose', data, (err) => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  broadcastTransactionAsync(data): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._bundle.isStarted()) {
        resolve();
      }
      this._bundle.pubsub.publish('transaction', data, (err) => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  broadcastNewBlockHeaderAsync(data): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._bundle.isStarted()) {
        resolve();
      }
      this._bundle.pubsub.publish('newBlockHeader', data, (err) => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  private addPeerToDb(peer) {
    // TODO implement
    global.app.logger.info(`[P2P] peer:connect:${peer.id.toB58String()}`);
  }

  private removePeerFromDb = (peer) => {
    // TODO implemnet
    global.app.logger.info(`[P2P] peer:disconnect:${peer.id.toB58String()}`);
    this._bundle.peerBook.remove(peer);
  }

  private peerDiscovery = async (peer) => {
    // do not spam log output: the bootstrap mechanism tries every 30s to connect to the bootstrap node(s)
    if (!this._bundle.peerBook.has(peer)) {
      global.app.logger.info(`[P2P] discovered peer: ${peer.id.toB58String()}`);
    }
    try {
      // this action establishes a __Connection__ to the newly discovered peer
      // this also adds the peer to the peerBook so the pubsub mechanism can publish to this peer
      await this._bundle.dialAsync(peer);
    } catch (err) {
      global.app.logger.info(`[P2P] could not dial to ${peer.id.toB58String()}`);
    }
  }

  getRandomNode() {
    const peerInfo = this._bundle.getRandomPeer();
    if (peerInfo) {
      const extracted = extractIpAndPort(peerInfo);
      global.app.logger.info(`[P2P] getRandomPeer: ${peerInfo.id.toB58String()}; ${JSON.stringify(extracted)}`);
      return extracted;
    }
  }
}
