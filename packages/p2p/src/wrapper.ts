import Libp2p, { Pubsub } from 'libp2p';
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
  ILogger,
  IPeer2PeerHandlers,
  SimplePeerInfo,
  IBlockWithTransactions,
  ITracer,
} from '@gnyio/interfaces';
import { serializedSpanContext, ISpan } from '@gnyio/tracer';
import uint8Arrays from 'uint8arrays';
import {
  isBlockAndVotes,
  isHeightWrapper,
  isCommonBlockResult,
  isSimplePeerInfoArray,
  isTracerWrapper,
} from '@gnyio/type-validation';
import AddressManager from 'libp2p/src/address-manager';
import { injectable, inject } from 'inversify';
import { TYPES } from '@gnyio/container';

export interface IPeerInfo {
  id: {
    id: string;
    pubKey: null;
  };
  multiaddrs: string[];
  simple: {
    host: string;
    port: string;
  };
}

export interface IInfo {
  id: string;
  multiaddrs: string[];
}

export interface IBundle {
  logger: ILogger;
  p2pConfig: IPeer2PeerHandlers;

  pushVotesToPeer(peerId: PeerId, votes: ManyVotes, span: ISpan): Promise<void>;

  requestBlockAndVotes(
    peerId: PeerId,
    blockIdWrapper: BlockIdWrapper,
    span: ISpan
  ): Promise<TracerWrapper<BlockAndVotes>>;

  requestCommonBlock(
    peerId: PeerId,
    commonBlockParams: CommonBlockParams,
    span: ISpan
  ): Promise<CommonBlockResult>;

  requestHeight(peerId: PeerId, parentSpan: ISpan): Promise<HeightWrapper>;

  requestBlocks(
    peerId: PeerId,
    params: BlocksWrapperParams,
    span: ISpan
  ): Promise<IBlockWithTransactions[]>;

  requestGetPeers(peerId: PeerId, span: ISpan): Promise<SimplePeerInfo[]>;

  getAllConnections(): any[];

  getAllConnectedPeersPeerInfo(): IPeerInfo[];

  info(): IInfo;

  findPeerInfoInDHT(p2pMsg): Promise<PeerId>;

  connect(peer, peerMultiaddr): Promise<void>;

  pushOnly(peerId, protocol, data): Promise<void>;

  handlePushOnly(protocol, cb): void;

  directRequest(peerId, protocol, data): Promise<any>;

  directResponse(protocol, func): void;

  rendezvousBroadcastsPeers(data): Promise<void>;

  broadcastProposeAsync(data): Promise<void>;

  broadcastTransactionAsync(data): Promise<void>;

  broadcastManyTransactionsAsync(data): Promise<void>;

  broadcastNewBlockHeaderAsync(data): Promise<void>;

  // from Libp2p
  start(): Promise<void>;
  stop(): Promise<void>;

  peerId: PeerId;

  addressManager: AddressManager;
  pubsub: Pubsub;
}

export type IP2PService = InstanceType<typeof Bundle>;

export interface P2POptions {
  peerId: PeerId;
  announceIp: string;
  port: number;

  logger: ILogger;
  config: IPeer2PeerHandlers;
}

@injectable()
export class Bundle extends Libp2p implements IBundle {
  logger: ILogger;
  p2pConfig: IPeer2PeerHandlers;
  tracer: ITracer;

  constructor(
    @inject(TYPES.P2POptions) p2pOptions: P2POptions,
    @inject(TYPES.TracerService) tracer: ITracer
  ) {
    const options: Libp2p.Libp2pOptions = {
      peerId: p2pOptions.peerId,
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/${p2pOptions.port}`],
        announce: [`/ip4/${p2pOptions.announceIp}/tcp/${p2pOptions.port}`],
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
    this.logger = p2pOptions.logger;
    this.p2pConfig = p2pOptions.config;
    this.tracer = tracer;
  }

  // not duplex
  // async
  async pushVotesToPeer(peerId: PeerId, votes: ManyVotes, span: ISpan) {
    this.logger.info('[p2p/wrapper] called pushVotesToPeer()');

    const before: TracerWrapper<ManyVotes> = {
      spanId: serializedSpanContext(this.tracer, span.context()),
      data: votes,
    };

    const data = uint8Arrays.fromString(JSON.stringify(before));
    await this.pushOnly(peerId, this.p2pConfig.V1_VOTES, data);
  }

  async requestBlockAndVotes(
    peerId: PeerId,
    blockIdWrapper: BlockIdWrapper,
    span: ISpan
  ): Promise<TracerWrapper<BlockAndVotes>> {
    this.logger.info('[p2p/wrapper] called requestBlockAndVotes()');

    const raw: TracerWrapper<BlockIdWrapper> = {
      spanId: serializedSpanContext(this.tracer, span.context()),
      data: blockIdWrapper,
    };

    const data = uint8Arrays.fromString(JSON.stringify(raw));

    const resultRaw = await this.directRequest(
      peerId,
      this.p2pConfig.V1_NEW_BLOCK_PROTOCOL,
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
    this.logger.info('[p2p/wrapper] called requestCommonBlock()');

    const raw: TracerWrapper<CommonBlockParams> = {
      spanId: serializedSpanContext(this.tracer, span.context()),
      data: commonBlockParams,
    };
    const data = JSON.stringify(raw);

    const resultRaw = await this.directRequest(
      peerId,
      this.p2pConfig.V1_COMMON_BLOCK,
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
      this.logger.error(
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
    this.logger.info('[p2p/wrapper] called requestHeight()');

    const heightSpan = this.tracer.startSpan('get height', {
      childOf: parentSpan.context(),
    });

    const raw: TracerWrapper<string> = {
      spanId: serializedSpanContext(this.tracer, heightSpan.context()),
      data: 'no param',
    };
    const data = uint8Arrays.fromString(JSON.stringify(raw));

    const resultRaw = await this.directRequest(
      peerId,
      this.p2pConfig.V1_GET_HEIGHT,
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
  ): Promise<IBlockWithTransactions[]> {
    this.logger.info('[p2p/wrapper] called requestBlocks()');

    const raw: TracerWrapper<BlocksWrapperParams> = {
      spanId: serializedSpanContext(this.tracer, span.context()),
      data: params,
    };
    const data = JSON.stringify(raw);

    const resultRaw = await this.directRequest(
      peerId,
      this.p2pConfig.V1_BLOCKS,
      data
    );

    const result: IBlock[] = JSON.parse(resultRaw.toString());
    // TODO validate
    return result;
  }

  async requestGetPeers(
    peerId: PeerId,
    span: ISpan
  ): Promise<SimplePeerInfo[]> {
    this.logger.info('[p2p/wrapper] called requestGetPeers()');

    const raw = serializedSpanContext(this.tracer, span.context());
    const data = JSON.stringify(raw);

    const resultRaw = await this.directRequest(
      peerId,
      this.p2pConfig.V1_GET_PEERS,
      data
    );

    const result = JSON.parse(resultRaw.toString());

    if (!isSimplePeerInfoArray(result)) {
      throw new Error(`[p2p][getPeers] validation failed`);
    }
    return result;
  }

  getAllConnections(): any[] {
    this.logger.info('[p2p/wrapper] called getAllConnections()');

    const connections = Array.from(this.connections.values());

    const result: any[] = connections
      .flat()
      .map(x => JSON.parse(JSON.stringify(x)));

    for (let i = 0; i < result.length; ++i) {
      delete result[i].localPeer;
    }
    return result;
  }

  getAllConnectedPeersPeerInfo(): IPeerInfo[] {
    this.logger.info('[p2p/wrapper] called getAllConnectedPeersPeerInfo()');

    const connections = Array.from(this.connections.keys());
    if (connections.length === 0) {
      const empty: IPeerInfo[] = [];
      this.logger.info('[p2p/wrapper] getAllConnectedPeersPeerInfo empty[]');
      return empty;
    }

    const allConnectedPeers: IPeerInfo[] = connections.map(x => {
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

      const result: IPeerInfo = {
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
      return result;
    });

    const temp = allConnectedPeers.filter(x => x !== null);
    this.logger.info(
      `[p2p/wrapper] getAllConnectedPeersPeerInfo result: ${JSON.stringify(
        temp
      )}`
    );

    return temp;
  }

  info(): IInfo {
    this.logger.info('[p2p/wrapper] called info()');

    const id = this.peerId.toB58String();
    const multi = this.addressManager.getAnnounceAddrs();

    return {
      id,
      multiaddrs: multi.map(x => `${x.toString()}/p2p/${id}`),
    };
  }

  async findPeerInfoInDHT(p2pMsg): Promise<PeerId> {
    this.logger.info('[p2p/wrapper] called findPeerInfoInDHT()');

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

  async connect(peer, peerMultiaddr): Promise<void> {
    this.logger.info('[p2p/wrapper] called connect()');

    if (PeerId.isPeerId(peer) === false) {
      throw new Error('argument is not PeerId');
    }
    this.logger.info('[p2p][connect] peer is valid');

    if (this.peerId.equals(peer)) {
      return;
    }

    // check if there are addresses for this peer saved
    const addresses = this.peerStore.addressBook.get(peer);
    if (!addresses) {
      this.logger.info(
        `[p2p/wrapper] connect() added peer to addressBook: ${JSON.stringify(
          peerMultiaddr
        )}`
      );
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
      this.logger.info(`[p2p][connect] dialing peer: ${peer.toB58String()}`);
      // does not work when using with AbortSignal
      await this.dial(peer);
      this.logger.info('[p2p][connect] connected successfully');
    } catch (err) {
      this.logger.info(
        `[p2p][connect] error: ${err.message}, ${JSON.stringify(peerMultiaddr)}`
      );
      return; // for next remote peer
    }
  }

  async pushOnly(peerId, protocol, data): Promise<void> {
    this.logger.info('[p2p/wrapper] called pushOnly()');

    this.logger.info(
      `[p2p] pushOnly "${protocol}" from ${this.peerId.toB58String()} -> ${peerId.toB58String()}`
    );

    const { stream } = await this.dialProtocol(peerId, protocol);

    this.logger.info(
      `pushOnly: "${protocol}" data: ${data.constructor === Uint8Array}`
    );
    await pipe(
      [data],
      stream.sink
    );
  }

  handlePushOnly(protocol, cb): void {
    this.logger.info('[p2p/wrapper] called handlePushOnly()');

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

  async directRequest(peerId, protocol, data): Promise<any> {
    this.logger.info('[p2p/wrapper] called directRequest()');

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

  directResponse(protocol, func): void {
    this.logger.info('[p2p/wrapper] called directResponse()');

    this.logger.info(`[p2p] attach protocol "${protocol}"`);

    this.handle(protocol, ({ stream }) => {
      pipe(
        stream,
        func,
        stream
      );
    });
  }

  async rendezvousBroadcastsPeers(data): Promise<void> {
    this.logger.info('[p2p/wrapper] called rendezvousBroadcastsPeers()');

    await this.pubsub.publish(this.p2pConfig.V1_RENDEZVOUS_BROADCAST, data);
    this.logger.info(`[p2p][rendezvous] announced all my peers to the network`);
  }

  async broadcastProposeAsync(data): Promise<void> {
    this.logger.info('[p2p/wrapper] called broadcastProposeAsync()');

    await this.pubsub.publish(this.p2pConfig.V1_BROADCAST_PROPOSE, data);
  }

  async broadcastTransactionAsync(data): Promise<void> {
    this.logger.info('[p2p/wrapper] called broadcastTransactionAsync()');

    await this.pubsub.publish(this.p2pConfig.V1_BROADCAST_TRANSACTION, data);
  }

  async broadcastManyTransactionsAsync(data): Promise<void> {
    this.logger.info('[p2p/wrapper] called broadcastManyTransactionsAsync()');

    await this.pubsub.publish(
      this.p2pConfig.V1_BROADCAST_MANY_TRANSACTIONS,
      data
    );
  }

  async broadcastNewBlockHeaderAsync(data): Promise<void> {
    this.logger.info('[p2p/wrapper] called broadcastNewBlockHeaderAsync()');

    await this.pubsub.publish(
      this.p2pConfig.V1_BROADCAST_NEW_BLOCK_HEADER,
      data
    );
  }
}

export function attachEventHandlers(node: Bundle, name: string): void {
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
    console.log(
      `[${name}] peer:connect peer "${connection.localPeer.toB58String()}"`
    );
    // const addresses = node.peerStore.addressBook.get(peer);
    // this.logger.info(`[${name}] peer:connect addresses "${peer.toB58String()}", "${JSON.stringify(addresses, null, 2)}`);
  });

  node.connectionManager.on('peer:disconnect', connection => {
    console.log(
      `[${name}] peer:disconnect peer "${connection.localPeer.toB58String()}`
    );
  });
}
