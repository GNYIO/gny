
const TCP = require('libp2p-tcp');
const libp2p = require('libp2p');
const DHT = require('libp2p-kad-dht');
const Mplex = require('libp2p-mplex');
const SECIO = require('libp2p-secio');

const pull = require('pull-stream');
const defaultsDeep = require('@nodeutils/defaults-deep');


export class Bundle extends libp2p {

  constructor(_options) {
    const defaults = {
      modules: {
        transport: [ TCP ],
        streamMuxer: [ Mplex ],
        connEncryption: [ SECIO ],
        dht: DHT,
      },
      config: {
        dht: {
          kBucketSize: 20,
          enabledDiscovery: true,
        },
        EXPERIMENTAL: {
          dht: true,
          pubsub: true,
        },
        peerDiscovery: {
          bootstrap: {
            interval: 1000,
            enabled: true,
            list: [],
          },
        },
      },
    };
    const finalConfig = defaultsDeep(_options, defaults);
    super(finalConfig);
  }

  getRandomPeer () {
    const allPeers = this.peerBook.getAll();
    if (allPeers) {
      const arr = Object.values(allPeers);
      const index = Math.floor(Math.random() * arr.length);
      return arr[index];
    } else {
      return undefined;
    }
  }

  startAsync () {
    return new Promise((resolve, reject) => {
      this.start((err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`started node: ${this.peerInfo.id.toB58String()}`);
          this.peerInfo.multiaddrs.forEach((adr) => console.log(`\t${adr}`));
          resolve();
        }
      });
    });
  }

  stopAsync () {
    return new Promise((resolve, reject) => {
      this.stop((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  _transformObjectToArray(obj) {
    return Object.keys(obj).map(key => obj[key]);
  }

  // broadcast protocal should start with "/broadcast:topic"
  broadcast(topic, message) {
    // TODO: on the handler function use a LRU cache
    let peers = this.peerBook.getAll();
    peers = this._transformObjectToArray(peers);

    const protocol = `/broadcast:${topic}`;

    // maybe use async parallel?
    peers.forEach((peer) => {
      this.dialProtocol(peer, protocol, (err, connection) => {
        pull(
          pull.values(message), // is it possible to use pull.values({}) with an object
          connection,
        );
      });
    });
  }

  dialAsync(peer) {
    return new Promise((resolve, reject) => {
      this.dial(peer, (err, connection) => {
        if (err) reject(err);
        else resolve(connection);
      });
    });
  }

  // ts reference misunderstand if argument is spelled exactly the same as the function name!
  async bootstrapPeerNodes(bootstrapNodes) {
    if (!Array.isArray(bootstrapNodes)) {
      throw new Error('bootstrap nodes need to be an array');
    }
    // TODO: check if every item in bootstrapNodes is a peer-info object
    if (!this.isStarted) {
      throw new Error('node is not started');
    }

    for (let i = 0; i < bootstrapNodes.length; ++i) {
      const boot = bootstrapNodes[i];
      // TODO: Add error handling!
      await this.dialAsync(boot);
    }
  }
}