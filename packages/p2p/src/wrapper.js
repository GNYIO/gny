const Libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const mplex = require('libp2p-mplex');
const { NOISE } = require('libp2p-noise');
const Gossipsub = require('libp2p-gossipsub');
const DHT = require('libp2p-kad-dht');
const Bootstrap = require('libp2p-bootstrap');
const PeerId = require('peer-id');
const pipe = require('it-pipe');
const first = require('it-first');

const {
  V1_BROADCAST_NEW_BLOCK_HEADER,
  V1_BROADCAST_TRANSACTION,
  V1_BROADCAST_PROPOSE,
  V1_BROADCAST_NEW_MEMBER,
} = require('./protocols');

class Bundle extends Libp2p {
  constructor(peerId, announceIp, port, bootstrapNode, logger) {
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

    // this needs to be conditional
    // otherwise it will throw on an empty bootstrap node list
    if (bootstrapNode.length > 0) {
      // add bootstrap
      options.modules.peerDiscovery = [Bootstrap];
      options.config.peerDiscovery.bootstrap = {
        enabled: true,
        list: bootstrapNode,
      };
    }

    super(options);
    this.logger = logger;
  }

  async findPeerInfoInDHT(p2pMsg) {
    const targetPeerId = PeerId.createFromB58String(p2pMsg.from);
    const address = this.peerStore.addressBook.get(targetPeerId);
    if (address) {
      return targetPeerId;
    } else {
      const peer = await this.peerRouting.findPeer(targetPeerId);
      return peer.id;
    }
  }

  async pushOnly(peerId, protocol, data) {
    this.logger.info(
      `[p2p] pushOnly "${protocol}" from ${this.peerId.toB58String()} -> ${peerId.toB58String()}`
    );

    const { stream } = await this.dialProtocol(peerId, protocol);

    console.log(
      `pushOnly: "${protocol}" data: ${data.constructor === Uint8Array}`
    );
    await pipe(
      [data],
      stream.sink
    );
  }

  handlePushOnly(protocol, cb) {
    this.handle(protocol, ({ stream }) => {
      try {
        // result of type BufferList
        pipe(
          stream.source,
          async function(source) {
            const one = await first(source);
            return cb(null, one);
          }
        );
      } catch (err) {
        this.logger.error(`[p2p] handlePushOnly error: ${err.message}`);
        this.logger.error(err);

        return cb(err);
      }
    });
  }

  async directRequest(peerId, protocol, data) {
    this.logger.info(
      `[p2p] dialing protocol "${protocol}" from ${this.peerId.toB58String()} -> ${peerId.toB58String()}`
    );

    const { stream } = await this.dialProtocol(peerId, protocol);
    const result = await pipe(
      [data],
      stream,
      async function test(source) {
        for await (const msg of source) {
          return msg;
        }
      }
    );
    return result;
  }

  directResponse(protocol, func) {
    this.logger.info(`[p2p] attach protocol "${protocol}"`);

    this.handle(protocol, ({ stream }) => {
      pipe(
        stream,
        func,
        stream
      );
    });
  }

  async broadcastNewMember(data) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_NEW_MEMBER, data);
  }

  async broadcastProposeAsync(data) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_PROPOSE, data);
  }

  async broadcastTransactionAsync(data) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_TRANSACTION, data);
  }

  async broadcastNewBlockHeaderAsync(data) {
    if (!this.isStarted()) {
      return;
    }
    await this.pubsub.publish(V1_BROADCAST_NEW_BLOCK_HEADER, data);
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

export function create(peerId, ip, port, bootstrapNode, logger) {
  const node = new Bundle(peerId, ip, port, bootstrapNode, logger);
  attachEventHandlers(node, ip);
  return node;
}
