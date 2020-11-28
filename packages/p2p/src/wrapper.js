const Libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const mplex = require('libp2p-mplex');
const { NOISE } = require('libp2p-noise');
const Gossipsub = require('libp2p-gossipsub');
const DHT = require('libp2p-kad-dht');

class Bundle extends Libp2p {
  constructor(peerId, announceIp, port) {
    const options = {
      peerId,
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/${port}`],
        announce: [`/ip4/${announceIp}/tcp/${port}`],
        noAnnounce: [`/ip4/0.0.0.0/tcp/${port}`],
      },
      modules: {
        transport: [TCP],
        dht: DHT,
        pubsub: Gossipsub,
        streamMuxer: [mplex],
        connEncryption: [NOISE],
      },
      config: {
        dialer: {
          maxDialsPerPeer: 1, // do not dial peers
          dialTimeout: 4000, // ms
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
          enabled: false,
          randomWalk: {
            enabled: false,
          },
        },
        relay: {
          enabled: false,
          hop: {
            enabled: false,
            active: false,
          },
        },
      },
    };

    super(options);
  }
}

function attachEventHandlers(node, name) {
  node.on('error', err => {
    try {
      console.log(`[${name}] err: ${err.message}`);
    } catch (err) {
      console.log('error in error');
    }
  });

  node.on('peer', peer => {
    console.log(`peer!!!!!!!!!!!!!!!!!!!!!!!!!`);
  });
  node.on('peer:discovery', async peer => {
    console.log(`[${name}] peer:discovery peer "${peer.toB58String()}"`);
  });

  node.connectionManager.on('peer:connect', connection => {
    console.log(
      `[${name}] peer:connect peer "${connection.localPeer.toB58String()}`
    );
  });

  node.connectionManager.on('peer:disconnect', connection => {
    console.log(
      `[${name}] peer:disconnect peer "${connection.localPeer.toB58String()}`
    );
  });
}

export function create(peerId, ip, port) {
  const node = new Bundle(peerId, ip, port);
  attachEventHandlers(node, ip);
  return node;
}
