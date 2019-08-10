const TCP = require('libp2p-tcp');
import * as libp2p from 'libp2p';
import * as DHT from 'libp2p-kad-dht';
const Mplex = require('libp2p-mplex');
const SECIO = require('libp2p-secio');
const Bootstrap = require('libp2p-bootstrap');
const GossipSub = require('libp2p-gossipsub');

const defaultsDeep = require('@nodeutils/defaults-deep');

export class Bundle extends libp2p {
  constructor(_options) {
    const defaults = {
      connectionManager: {
        // this plays into the option autoDial: true
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
          enabled: false,
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
    console.log(`used configuration: ${JSON.stringify(finalConfig, null, 2)}`);
    super(finalConfig);
  }

  dialAsync(peer) {
    return new Promise((resolve, reject) => {
      this.dial(peer, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
