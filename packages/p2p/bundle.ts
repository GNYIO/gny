
const TCP = require('libp2p-tcp');
const libp2p = require('libp2p');
const DHT = require('libp2p-kad-dht');
const Mplex = require('libp2p-mplex');
const SECIO = require('libp2p-secio');
const Bootstrap = require('libp2p-bootstrap');

const defaultsDeep = require('@nodeutils/defaults-deep');


export class Bundle extends libp2p {

  constructor(_options) {
    const defaults = {
      modules: {
        transport: [ TCP ],
        streamMuxer: [ Mplex ],
        connEncryption: [ SECIO ],
        peerDiscovery: [ Bootstrap ],
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
            interval: 10 * 1000,
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
          const addresses = '';
          this.peerInfo.multiaddrs.forEach((adr) => addresses.concat(`\t${adr}`));
          global.app.logger.info(`[P2P] started node: ${this.peerInfo.id.toB58String()}\n${addresses}`);
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