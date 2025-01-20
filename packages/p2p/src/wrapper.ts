import Libp2p from 'libp2p';
import TCP from 'libp2p-tcp';
import mplex from 'libp2p-mplex';
import { NOISE } from 'libp2p-noise';
import Gossipsub from 'libp2p-gossipsub';
import DHT from 'libp2p-kad-dht';
import * as PeerId from 'peer-id';
import pipe from 'it-pipe';
import first from 'it-first';
import multiaddr from 'multiaddr';
import { duplex as abortableDuplex } from 'abortable-iterator';
import {
  BlockAndVotes,
  TracerWrapper,
  BlockIdWrapper,
  ManyVotes,
  CommonBlockParams,
  CommonBlockResult,
  HeightWrapper,
  BlocksWrapperParams,
  IBlock,
} from '@gnyio/interfaces';
import { serializedSpanContext, ISpan } from '@gnyio/tracer';
import uint8Arrays from 'uint8arrays';
import {
  isCommonBlockParams,
  isBlocksWrapperParams,
  isBlockAndVotes,
  isManyVotes,
  isHeightWrapper,
  isBlockIdWrapper,
  isCommonBlockResult,
  isSimplePeerInfoArray,
  isTracerWrapper,
} from '@gnyio/type-validation';

export class Bundle extends Libp2p {
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

  // not duplex
  // async
  async pushVotesToPeer(peerId: PeerId, votes: ManyVotes, span: ISpan) {
    const before: TracerWrapper<ManyVotes> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: votes,
    };

    const data = uint8Arrays.fromString(JSON.stringify(before));
    await this.pushOnly(peerId, global.Config.p2pConfig.V1_VOTES, data);
  }

  async requestBlockAndVotes(
    peerId: PeerId,
    blockIdWrapper: BlockIdWrapper,
    span: ISpan
  ): Promise<TracerWrapper<BlockAndVotes>> {
    const raw: TracerWrapper<BlockIdWrapper> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: blockIdWrapper,
    };

    const data = uint8Arrays.fromString(JSON.stringify(raw));

    const resultRaw = await this.directRequest(
      peerId,
      global.Config.p2pConfig.V1_NEW_BLOCK_PROTOCOL,
      data
    );

    // TracerWrapper<BlockAndVotes>
    const result: TracerWrapper<BlockAndVotes> = JSON.parse(
      resultRaw.toString()
    );
    if (!isTracerWrapper(result) || !isBlockAndVotes(result.data)) {
      throw new Error('[p2p] validation for requested isBlockPropose failed');
    }

    return result;
  }

  // step1: node1 -> node2
  async requestCommonBlock(
    peerId: PeerId,
    commonBlockParams: CommonBlockParams,
    span: ISpan
  ): Promise<CommonBlockResult> {
    const raw: TracerWrapper<CommonBlockParams> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: commonBlockParams,
    };
    const data = JSON.stringify(raw);

    const resultRaw = await this.directRequest(
      peerId,
      global.Config.p2pConfig.V1_COMMON_BLOCK,
      data
    );
    const result: CommonBlockResult = JSON.parse(resultRaw.toString());

    if (!isCommonBlockResult(result)) {
      span.setTag('error', true);
      span.log({
        value: '[p2p][commonBlock] CommonBlockResult could not be validated',
      });
      span.log({
        returnValue: result,
      });
      span.finish();
      global.app.logger.error(
        '[p2p][commonBlock] CommonBlockResult could not be validated'
      );
      throw new Error(
        '[p2p][commonBlock] CommonBlockResult could not be validated'
      );
    }

    return result;
  }

  async requestHeight(
    peerId: PeerId,
    parentSpan: ISpan
  ): Promise<HeightWrapper> {
    const heightSpan = global.library.tracer.startSpan('get height', {
      childOf: parentSpan.context(),
    });

    const raw: TracerWrapper<string> = {
      spanId: serializedSpanContext(
        global.library.tracer,
        heightSpan.context()
      ),
      data: 'no param',
    };
    const data = uint8Arrays.fromString(JSON.stringify(raw));

    const resultRaw = await this.directRequest(
      peerId,
      global.Config.p2pConfig.V1_GET_HEIGHT,
      data
    );
    const result: HeightWrapper = JSON.parse(resultRaw.toString());

    if (!isHeightWrapper(result)) {
      heightSpan.log({
        log: '[p2p] validation for isHeightWrapper failed',
        got: result,
      });
      heightSpan.setTag('error', true);
      heightSpan.finish();
      throw new Error('[p2p] validation for isHeightWrapper failed');
    }

    heightSpan.log({
      result: result,
    });
    heightSpan.finish();

    return result;
  }

  async requestBlocks(
    peerId: PeerId,
    params: BlocksWrapperParams,
    span: ISpan
  ): Promise<IBlock[]> {
    const raw: TracerWrapper<BlocksWrapperParams> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: params,
    };
    const data = JSON.stringify(raw);

    const resultRaw = await this.directRequest(
      peerId,
      global.Config.p2pConfig.V1_BLOCKS,
      data
    );

    const result: IBlock[] = JSON.parse(resultRaw.toString());
    // TODO validate
    return result;
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

  async connect(peer, peerMultiaddr) {
    if (PeerId.isPeerId(peer) === false) {
      throw new Error('argument is not PeerId');
    }
    console.log('[p2p][connect] peer is valid');

    if (this.peerId.equals(peer)) {
      return;
    }

    // check if there are addresses for this peer saved
    const addresses = this.peerStore.addressBook.get(peer);
    if (!addresses) {
      this.peerStore.addressBook.set(peer, [peerMultiaddr]);
    }

    // 0. no need to check if already in peerStore (peer always in peerStore)
    // 1. check if have connection
    // yes, then return
    // 2. if not, then dial
    const connections = Array.from(this.connections.keys());
    const inConnection = connections.find(x => x === peer.toB58String());
    if (inConnection) {
      return; // for next remote peer
    }

    try {
      console.log(
        `[p2p][connect] dialing peer: ${peer}, ${JSON.stringify(
          this.peerStore.addressBook.get(peer),
          null,
          2
        )}`
      );
      await this.dial(peer);
    } catch (err) {
      console.log(
        `[p2p][connect] error: ${err.message}, ${JSON.stringify(
          peerMultiaddr,
          null,
          2
        )}`
      );
      return; // for next remote peer
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

    const signal = AbortSignal.timeout(3000);
    const myDial = await this.dialProtocol(peerId, protocol);

    const result = await pipe(
      [data],
      abortableDuplex(myDial.stream, signal),
      first
      // async function test(source) {
      //   for await (const msg of source) {
      //     return msg;
      //   }
      // }
    );

    return result.toString();
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

  async broadcastManyTransactionsAsync(data) {
    await this.pubsub.publish(
      this.p2pConfig.V1_BROADCAST_MANY_TRANSACTIONS,
      data
    );
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
