import * as _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';
import { create } from '@gny/p2p';
import { PeerNode, ICoreModule } from '@gny/interfaces';
import * as PeerId from 'peer-id';
import { attachDirectP2PCommunication } from './PeerHelper.js';
import Transport from './transport.js';
import uint8Arrays from 'uint8arrays';
import multiaddr from 'multiaddr';
import { StateHelper } from './StateHelper.js';
import BigNumber from 'bignumber.js';
import Loader from './loader.js';
import { serializedSpanContext } from '@gny/tracer';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default class Peer implements ICoreModule {
  public static p2p;

  public static getVersion = () => ({
    version: global.library.config.version,
    build: global.library.config.buildVersion,
    net: global.library.config.netVersion,
  });

  public static request = async (
    endpoint: string,
    body: any,
    contact: PeerNode,
    timeout?: number
  ) => {
    const address = `${contact.host}:${contact.port - 1}`;
    const uri = `http://${address}/peer/${endpoint}`;
    global.library.logger.debug(`start to request ${uri}`);
    const headers = {
      magic: global.Config.magic,
      version: global.Config.version,
    };

    let result;
    try {
      const config: AxiosRequestConfig = {
        headers: headers,
        responseType: 'json',
        timeout: undefined || timeout,
      };
      result = await axios.post(uri, body, config);
      if (result.status !== 200) {
        throw new Error(
          `Invalid status code: ${result.statusCode}, error: ${result.data}`
        );
      }
      return result.data;
    } catch (err) {
      const span = global.app.tracer.startSpan('request');
      span.setTag('error', true);
      span.log({
        value: `Failed to request remote peer: ${err.message}`,
      });
      span.finish();

      global.library.logger.error(
        `Failed to request remote peer: ${err.message}`
      );
      global.library.logger.error(
        JSON.stringify(err.response ? err.response.data : err.message)
      );
      throw err;
    }
  };

  public static randomRequestAsync = async (method: string, params: any) => {
    const randomNode = Peer.p2p.getConnectedRandomNode();
    if (!randomNode) throw new Error('no contact');
    global.library.logger.debug(
      `[p2p] select random contract: ${JSON.stringify(randomNode)}`
    );
    try {
      const result = await Peer.request(method, params, randomNode, 4000);
      return {
        data: result,
        node: randomNode,
      };
    } catch (err) {
      throw err;
    }
  };

  public static preparePeerId = async () => {
    const buf = Buffer.from(
      global.library.config.peers.privateP2PKey,
      'base64'
    );
    const peerId = await PeerId.createFromPrivKey(buf);

    return peerId;
  };

  public static initializeLibP2P = async (
    bootstrapNode: string[],
    peerId: PeerId
  ) => {
    const wrapper = create(
      peerId,
      global.library.config.publicIp,
      global.library.config.peerPort,
      bootstrapNode,
      global.library.logger,
      global.Config.p2pConfig
    );
    Peer.p2p = wrapper;
    attachDirectP2PCommunication(Peer.p2p);

    await Peer.p2p.start();
    global.library.logger.info('[p2p] libp2p started');

    global.library.logger.info(
      `announceAddresses: ${JSON.stringify(
        Peer.p2p.addressManager.getAnnounceAddrs().map(x => x.toString())
      )}`
    );
    global.library.logger.info(
      `listenAddresses: ${JSON.stringify(
        Peer.p2p.addressManager.getListenAddrs().map(x => x.toString())
      )}`
    );

    const startUpSpan = global.library.tracer.startSpan('startUp');
    startUpSpan.setTag('peerId', Peer.p2p.peerId.toB58String());
    startUpSpan.log({
      announceAddresses: Peer.p2p.addressManager
        .getAnnounceAddrs()
        .map(x => x.toString()),
      listenAddresses: Peer.p2p.addressManager
        .getListenAddrs()
        .map(x => x.toString()),
    });
    startUpSpan.finish();

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_NEW_BLOCK_HEADER,
      Transport.receivePeer_NewBlockHeader
    );
    await Peer.p2p.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_NEW_BLOCK_HEADER
    );

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_PROPOSE,
      Transport.receivePeer_Propose
    );
    await Peer.p2p.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_PROPOSE
    );

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_TRANSACTION,
      Transport.receivePeer_Transaction
    );
    await Peer.p2p.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_TRANSACTION
    );

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_RENDEZVOUS_BROADCAST,
      Transport.receivePeers_from_rendezvous_Broadcast
    );
    await Peer.p2p.pubsub.subscribe(
      global.Config.p2pConfig.V1_RENDEZVOUS_BROADCAST
    );
  };

  public static rendezvousBroadcastIfRendezvous = async () => {
    // only the rondezvous node should announce the peers it has
    // this replaces the constant announcing yourself to the network
    // which produces far to many messages
    // no peers === I am rendezvous node
    async function announce() {
      const span = global.library.tracer.startSpan('rendezvous broadcast');

      const peers = Peer.p2p.getAllConnectedPeersPeerInfo();

      const data = {
        spanId: serializedSpanContext(global.library.tracer, span.context()),
        peers: peers,
      };
      span.log(data);

      const converted = uint8Arrays.fromString(JSON.stringify(data));
      await Peer.p2p.rendezvousBroadcastsPeers(converted);

      span.finish();

      setTimeout(announce, 10 * 1000);
    }

    // execute right away
    setImmediate(announce);
  };

  public static dial = async (bootstrapNode: string[]) => {
    // dial to peers in GNY_P2P_PEERS env variable
    // normally this is only the rendezvous node
    for (let i = 0; i < bootstrapNode.length; ++i) {
      try {
        const m2 = multiaddr(bootstrapNode[i]);
        const b58String = m2.getPeerId();

        const peerId = PeerId.createFromB58String(b58String);

        await Peer.p2p.connect(peerId, m2);
      } catch (err) {
        console.log(err);
      }
    }
  };

  public static dialRendezvousNodeIfNormalNode = async (
    bootstrapNode: string[]
  ) => {
    // execute right away
    await Peer.dial(bootstrapNode);
    const tenSeconds = 10 * 1000;

    // execute forever every 10 seconds
    const dialRendezvousLoop = async () => {
      console.log('[p2p] dial rendezvous node');
      await Peer.dial(bootstrapNode);
      setTimeout(dialRendezvousLoop, tenSeconds);
    };

    setImmediate(dialRendezvousLoop);
  };

  public static askRendezvousNodeForPeers = async (bootstrapNode: string[]) => {
    const m = multiaddr(bootstrapNode[0]);
    const rendezvousNode = PeerId.createFromB58String(m.getPeerId());

    const span = global.app.tracer.startSpan('request peers');
    let peers = null;
    try {
      peers = await Peer.p2p.requestGetPeers(rendezvousNode, span);
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

  public static syncIfStuck = () => {
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
        const span = global.library.tracer.startSpan('is stuck');
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
            Loader.syncBlocksFromPeer(result.decision.peerToSyncFrom);
          } else {
            span.log({
              message: 'did not sync',
            });
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

      setTimeout(checkIfStuck, 30 * 1000);
    }
    setTimeout(checkIfStuck, 30 * 1000);
  };

  // Events
  public static onBlockchainReady = async () => {
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

    const bootstrapNode = global.library.config.peers.bootstrap
      ? global.library.config.peers.bootstrap
      : [];
    const peerId = await Peer.preparePeerId();

    await Peer.initializeLibP2P(bootstrapNode, peerId);

    const isRondezvous =
      Array.isArray(bootstrapNode) === false || bootstrapNode.length === 0;
    if (isRondezvous) {
      await Peer.rendezvousBroadcastIfRendezvous();
      await sleep(7 * 1000); // else wait for a few peers to connect
    } else {
      await Peer.dialRendezvousNodeIfNormalNode(bootstrapNode);
      await Peer.askRendezvousNodeForPeers(bootstrapNode);
    }

    // check every 30 seconds if we are stuck
    Peer.syncIfStuck();

    // ask peers for their height
    const span = global.library.tracer.startSpan('ask peers');
    const lastBlock = StateHelper.getState().lastBlock;

    const result = await Loader.silentlyContactPeers(lastBlock, span);
    span.finish();

    if (result === undefined || result.decision.action === 'forge') {
      global.library.bus.message('onPeerReady');
      return;
    }

    if (result.decision.action === 'sync') {
      const fireEvent = true; // important
      Loader.syncBlocksFromPeer(result.decision.peerToSyncFrom, fireEvent);
      return;
    }

    throw new Error('should never come here');
  };

  public static cleanup = cb => {
    Peer.p2p.stop(cb);
    global.library.logger.debug('Cleaning up core/peer');
  };
}
