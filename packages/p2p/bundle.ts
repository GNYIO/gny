
const TCP = require('libp2p-tcp');
import * as libp2p from 'libp2p';
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

  startAsync () {
    return new Promise((resolve, reject) => {
      this.start((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  stopAsync (): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stop((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  dialAsync(peer) {
    return new Promise((resolve, reject) => {
      this.dial(peer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}