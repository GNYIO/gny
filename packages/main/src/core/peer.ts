import axios, { AxiosRequestConfig } from 'axios';
import * as p2p from '@gnyio/p2p';
import { PeerNode, ICoreModule, ITracer } from '@gnyio/interfaces';
import * as PeerId from 'peer-id';
import { attachDirectP2PCommunication } from './PeerHelper.js';
import Transport from './transport.js';
import uint8Arrays from 'uint8arrays';
import multiaddr from 'multiaddr';
import * as StateHelper from './StateHelper.js';
import BigNumber from 'bignumber.js';
import Loader from './loader.js';
import { serializedSpanContext } from '@gnyio/tracer';
import pMinDelay from 'p-min-delay';
import * as LoaderHelper from './LoaderHelper.js';
import { Cron } from 'croner';
import { container, TYPES } from '@gnyio/container';
import { Mutex } from 'async-mutex';
import { IP2PService } from '@gnyio/p2p';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default class Peer implements ICoreModule {
  public static getVersion = () => ({
    version: global.library.config.version,
    build: global.library.config.buildVersion,
    net: global.library.config.netVersion,
  });

  public static async initializeLibP2P(p2pService: IP2PService) {
    attachDirectP2PCommunication(p2pService);

    await p2pService.start();
    global.library.logger.info('[p2p] libp2p started');

    global.library.logger.info(
      `announceAddresses: ${JSON.stringify(
        p2pService.addressManager.getAnnounceAddrs().map(x => x.toString())
      )}`
    );
    global.library.logger.info(
      `listenAddresses: ${JSON.stringify(
        p2pService.addressManager.getListenAddrs().map(x => x.toString())
      )}`
    );

    const tracerService = container.get<ITracer>(TYPES.TracerService);

    const startUpSpan = tracerService.startSpan('startUp');
    startUpSpan.setTag('peerId', p2pService.peerId.toB58String());
    startUpSpan.log({
      announceAddresses: p2pService.addressManager
        .getAnnounceAddrs()
        .map(x => x.toString()),
      listenAddresses: p2pService.addressManager
        .getListenAddrs()
        .map(x => x.toString()),
    });
    startUpSpan.finish();

    p2pService.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_NEW_BLOCK_HEADER,
      Transport.receivePeer_NewBlockHeader
    );
    await p2pService.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_NEW_BLOCK_HEADER
    );

    p2pService.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_PROPOSE,
      Transport.receivePeer_Propose
    );
    await p2pService.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_PROPOSE
    );

    p2pService.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_TRANSACTION,
      Transport.receivePeer_Transaction
    );
    await p2pService.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_TRANSACTION
    );

    p2pService.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_MANY_TRANSACTIONS,
      Transport.receivePeer_many_Transactions
    );
    await p2pService.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_MANY_TRANSACTIONS
    );

    p2pService.pubsub.on(
      global.Config.p2pConfig.V1_RENDEZVOUS_BROADCAST,
      Transport.receivePeers_from_rendezvous_Broadcast
    );
    await p2pService.pubsub.subscribe(
      global.Config.p2pConfig.V1_RENDEZVOUS_BROADCAST
    );
  }

  public static async dial(bootstrapNode: string[]) {
    // dial to peers in GNY_P2P_PEERS env variable
    // normally this is only the rendezvous node
    for (let i = 0; i < bootstrapNode.length; ++i) {
      try {
        const m2 = multiaddr(bootstrapNode[i]);
        const b58String = m2.getPeerId();

        const peerId = PeerId.createFromB58String(b58String);

        const p2pService = container.get<p2p.IP2PService>(TYPES.P2PService);
        await p2pService.connect(peerId, m2);
      } catch (err) {
        console.log(err);
      }
    }
  }

  public static askRendezvousNodeForPeers = async (bootstrapNode: string[]) => {
    const m = multiaddr(bootstrapNode[0]);
    const rendezvousNode = PeerId.createFromB58String(m.getPeerId());

    const tracerService = container.get<ITracer>(TYPES.TracerService);

    const span = tracerService.startSpan('request peers');
    let peers = null;
    try {
      const p2pService = container.get<IP2PService>(TYPES.P2PService);
      peers = await p2pService.requestGetPeers(rendezvousNode, span);
    } catch (err) {
      span.log({
        err,
      });
      span.setTag('error', true);
      span.finish();
      return;
    }

    span.log({
      received: peers,
    });
    const peersFromRendezvousNode = peers.map(x => x.multiaddrs[0]);
    await Peer.dial(peersFromRendezvousNode);

    span.finish();
  };

  public static syncIfStuck = async () => {
    // sync to highest node, especially when the whole network is stuck
    let height30SecondsAgo = String(StateHelper.getState().lastBlock.height);

    async function checkIfStuck() {
      const state = StateHelper.getState();

      const lastBlock = state.lastBlock;

      const heightNow = String(state.lastBlock.height);
      global.library.logger.info(
        `height30SecondsAgo: ${height30SecondsAgo}, heightNow: ${heightNow}`
      );

      // no new height for 30 seconds, look if any other node has a higher node
      if (new BigNumber(height30SecondsAgo).isEqualTo(heightNow)) {
        const tracerService = container.get<ITracer>(TYPES.TracerService);

        const span = tracerService.startSpan('is stuck');
        span.log({
          height30SecondsAgo,
          heightNow,
        });
        try {
          const result = await Loader.silentlyContactPeers(lastBlock, span);
          span.log({
            result: result ? result.decision.action : null,
          });
          if (typeof result === 'object' && result.decision.action === 'sync') {
            span.log({
              message: 'sync from:',
              peerToSyncFrom: result.decision.peerToSyncFrom.toB58String(),
            });
            await Loader.syncBlocksFromPeer(result.decision.peerToSyncFrom);
          }

          if (
            typeof result === 'object' &&
            result.decision.action === 'rollback'
          ) {
            const mutex = container.get<Mutex>(TYPES.MutexService);

            await mutex.runExclusive(async () => {
              await LoaderHelper.investigateFork(lastBlock, span);
            });
            await Loader.syncBlocksFromPeer(
              result.decision.peerIdCommonBlockHeight.peerId,
              true
            );
          }
        } catch (err) {
          span.log({
            error: err,
          });
        }

        span.finish();
      } else {
        height30SecondsAgo = heightNow;
      }
    }

    while (true) {
      await pMinDelay(checkIfStuck(), 30 * 1000);
    }
  };

  // Events
  public static async onBlockchainReady() {
    // # if rendezvous node
    //   # broadcast neighor nodes
    // # if not rendezvous node
    //   # dial rendezvous node
    // # find peers, maybe wait a little for peers
    //   # if found peers
    //     # ask for common block
    //     # sync if necessary
    //     # rollback if necessary
    //     # then activate block creation
    //   # else
    //     # rollbackback if necessary
    //     # then activate block creation

    console.log('[Peer.ts] onBlockchainReady()');

    const bootstrapNode = global.library.config.peers.bootstrap
      ? global.library.config.peers.bootstrap
      : [];

    const isRondezvous =
      Array.isArray(bootstrapNode) === false || bootstrapNode.length === 0;
    if (isRondezvous) {
      // only the rondezvous node should announce the peers it has
      // this replaces the constant announcing yourself to the network
      // which produces far to many messages
      // no peers === I am rendezvous node

      await sleep(7 * 1000); // wait for a few peers to connect

      new Cron(
        '*/10 * * * * *',
        {
          interval: 10,
          unref: true,
          protect: true,
        },
        async () => {
          const tracerService = container.get<ITracer>(TYPES.TracerService);

          const span = tracerService.startSpan('rendezvous broadcast');

          const p2pService = container.get<IP2PService>(TYPES.P2PService);
          const peers = p2pService.getAllConnectedPeersPeerInfo();

          const data = {
            spanId: serializedSpanContext(tracerService, span.context()),
            peers: peers,
          };
          span.log(data);

          const converted = uint8Arrays.fromString(JSON.stringify(data));
          await p2pService.rendezvousBroadcastsPeers(converted);

          span.finish();
        }
      );
    } else {
      // one manual dial
      await Peer.dial(bootstrapNode);

      new Cron(
        '*/10 * * * * *',
        {
          interval: 10, // Minimum number of seconds between triggers.
          unref: true, // Setting this to true unrefs the internal timer, which allows the process to exit even if a cron job is running.
          protect: true, // Enabled over-run protection. Will block new triggers as long as an old trigger is in progress. Pass either true or a callback function to enable
        },
        async () => {
          // also supports asynchronous functions
          await Peer.dial(bootstrapNode);
        }
      );

      await Peer.askRendezvousNodeForPeers(bootstrapNode);
    }

    // check every 30 seconds if we are stuck
    // fire and forget
    // here we deliberately not "await" the promise
    Peer.syncIfStuck();

    // ask peers for their height
    const tracerService = container.get<ITracer>(TYPES.TracerService);

    const span = tracerService.startSpan('ask peers');
    const lastBlock = StateHelper.getState().lastBlock;

    const result = await Loader.silentlyContactPeers(lastBlock, span);
    span.finish();

    if (result === undefined || result.decision.action === 'forge') {
      global.library.bus.message('onPeerReady');
      return;
    }

    if (result.decision.action === 'sync') {
      const fireEvent = true; // important
      await Loader.syncBlocksFromPeer(
        result.decision.peerToSyncFrom,
        fireEvent
      );
      return;
    }

    if (result.decision.action === 'rollback') {
      const mutex = container.get<Mutex>(TYPES.MutexService);

      await mutex.runExclusive(async () => {
        await LoaderHelper.investigateFork(lastBlock, span);
      });
      await Loader.syncBlocksFromPeer(
        result.decision.peerIdCommonBlockHeight.peerId,
        true
      );

      return;
    }

    throw new Error('should never come here');
  }

  public static cleanup = cb => {
    const p2pService = container.get<p2p.IP2PService>(TYPES.P2PService);
    p2pService.stop(cb);

    global.library.logger.debug('Cleaning up core/peer');
  };
}
