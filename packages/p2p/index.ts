
import { Bundle } from './bundle';
import * as PeerId from 'peer-id';
import { extractIpAndPort } from './util';
import * as fs from 'fs';
import { createPeerInfoArgs, createFromJSON, } from './createPeerInfo';

export class Peer2Peer {
  private _bundle: Bundle;
  constructor () {
  }

  async start(ip: string, port: number, bootstrapNode: string) {
    let KEY = fs.readFileSync('./p2p_key.json', { encoding: 'utf8' });
    KEY = JSON.parse(KEY);
    const peerId = await createFromJSON(KEY);
    const peerInfo = await createPeerInfoArgs(peerId);
    const multi = `/ip4/${ip}/tcp/${port}`;
    peerInfo.multiaddrs.add(multi);

    this._bundle = new Bundle({ peerInfo });

    await this._bundle.startAsync();
    this._bundle.on('peer:connect', this.addPeerToDb);
    this._bundle.on('peer:disconnect', this.removePeerFromDb);

    try {
      await this._bundle.dialAsync(bootstrapNode);
    } catch (err) {
      console.log(err);
    }
  }

  subscribe (topic, handler) {
    // this filters message out which are send to the own onde
    const preFilteredMessage = (message) => {
      if (message.from === this._bundle.peerInfo.id.toB58String()) {
        return;
      }
      const id = PeerId.createFromB58String(message.from);
      this._bundle.peerRouting.findPeer(id, {}, (err, result) => {
        if (err) {
          return;
        }

        message.peerInfo = extractIpAndPort(result);

        handler(message); // invoke handler
      });
    };

    this._bundle.pubsub.subscribe(topic, preFilteredMessage, () => {});
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
    console.log(`peer:connect:${peer.id.toB58String()}`);
  }

  private removePeerFromDb(peer) {
    // TODO implemnet
    console.log(`peer:disconnect:${peer.id.toB58String()}`);
  }

  getRandomNode() {
    const peerInfo = this._bundle.getRandomPeer();
    if (peerInfo) {
      console.log(`getRandomPeer: ${peerInfo.id.toB58String()}`);
      peerInfo.multiaddrs.forEach((x) => console.log(x.toString()));
      const extracted = extractIpAndPort(peerInfo);
      console.log(JSON.stringify(extracted, null, 2));
      return extracted;
    }
  }
}
