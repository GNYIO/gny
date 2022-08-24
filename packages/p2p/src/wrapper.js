const Libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const mplex = require('libp2p-mplex');
const { NOISE } = require('libp2p-noise');
const Gossipsub = require('libp2p-gossipsub');
const DHT = require('libp2p-kad-dht');
const PeerId = require('peer-id');
const pipe = require('it-pipe');
const first = require('it-first');
const multiaddr = require('multiaddr');

class Bundle extends Libp2p {
  constructor(peerId, announceIp, port, bootstrapNode, logger, p2pConfig) {
    const options = {
      peerId,
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/${port}`],
        announce: [`/ip4/${announceIp}/tcp/${port}`],
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
          enabled: true,
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
    this.logger = logger;
    this.p2pConfig = p2pConfig;
  }

  getAllConnections() {
    const connections = Array.from(this.connections.values());

    const result = connections.flat().map(x => JSON.parse(JSON.stringify(x)));

    for (let i = 0; i < result.length; ++i) {
      delete result[i].localPeer;
    }
    return result;
  }

  getAllConnectedPeersPeerInfo() {
    const connections = Array.from(this.connections.keys());
    if (connections.length === 0) {
      return [];
    }

    const allConnectedPeers = connections.map(x => {
      const peerId = PeerId.createFromB58String(x);
      const addresses = this.peerStore.addressBook
        .get(peerId)
        .map(x => multiaddr(x.multiaddr))
        .map(x => x.encapsulate(`/p2p/${peerId.toB58String()}`));

      if (!addresses) {
        this.logger.info(
          `[p2p][getAllConnectedPeersPeerInfo] no multiaddrs for peer: ${x}`
        );
        return null;
      }

      return {
        id: {
          id: peerId.toB58String(),
          pubKey: null,
        },
        multiaddrs: addresses.map(x => x.toString()),
        simple: {
          host: addresses[0].nodeAddress().address,
          port: addresses[0].nodeAddress().port,
        },
      };
    });

    return allConnectedPeers;
  }

  info() {
    const id = this.peerId.toB58String();
    const multi = this.addressManager.getAnnounceAddrs();

    return {
      id,
      multiaddrs: multi.map(x => `${x.toString()}/p2p/${id}`),
    };
  }

  async findPeerInfoInDHT(p2pMsg) {
    const targetPeerId = PeerId.createFromB58String(p2pMsg.from);

    if (targetPeerId.equals(this.peerId)) {
      this.logger.info(
        `[p2p][findPeerInfoInDHT] trying to search for own peerId, going to throw`
      );
      throw new Error('try to find own peerId in peerRouting');
    }

    const address = this.peerStore.addressBook.get(targetPeerId);
    if (address) {
      this.logger.info(
        `[þ2p][findPeerInfoInDHT] peerId: "${targetPeerId.toB58String()}" to addresses: ${JSON.stringify(
          address,
          null,
          2
        )}`
      );
      return targetPeerId;
    } else {
      this.logger.info(
        `[p2p][findPeerInfoInDHT] "${this.peerId.toB58String()}" -> "${targetPeerId.toB58String()}"`
      );
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

  async rendezvousBroadcastsPeers(data) {
    await this.pubsub.publish(this.p2pConfig.V1_RENDEZVOUS_BROADCAST, data);
    this.logger.info(`[p2p][rendezvous] announced all my peers to the network`);
  }

  async broadcastProposeAsync(data) {
    await this.pubsub.publish(this.p2pConfig.V1_BROADCAST_PROPOSE, data);
  }

  async broadcastTransactionAsync(data) {
    await this.pubsub.publish(this.p2pConfig.V1_BROADCAST_TRANSACTION, data);
  }

  async broadcastNewBlockHeaderAsync(data) {
    await this.pubsub.publish(
      this.p2pConfig.V1_BROADCAST_NEW_BLOCK_HEADER,
      data
    );
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
    const addresses = node.peerStore.addressBook.get(peer);
    console.log(
      `[${name}] peer:discovery addresses "${peer.toB58String()}", "${JSON.stringify(
        addresses,
        null,
        2
      )}`
    );
  });

  node.connectionManager.on('peer:connect', connection => {
    // console.log(
    //   `[${name}] peer:connect peer "${connection.localPeer.toB58String()}"`
    // );
    // const addresses = node.peerStore.addressBook.get(peer);
    // console.log(`[${name}] peer:connect addresses "${peer.toB58String()}", "${JSON.stringify(addresses, null, 2)}`);
  });

  node.connectionManager.on('peer:disconnect', connection => {
    console.log(
      `[${name}] peer:disconnect peer "${connection.localPeer.toB58String()}`
    );
  });
}

export function create(peerId, ip, port, bootstrapNode, logger, p2pConfig) {
  const node = new Bundle(peerId, ip, port, bootstrapNode, logger, p2pConfig);
  attachEventHandlers(node, ip);
  return node;
}
