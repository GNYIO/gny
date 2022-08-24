import * as _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';
import { create } from '@gny/p2p';
import { PeerNode, ICoreModule, P2PPeerIdAndMultiaddr } from '@gny/interfaces';
import * as PeerId from 'peer-id';
import { attachDirectP2PCommunication } from './PeerHelper';
import Transport from './transport';
const uint8ArrayFromString = require('uint8arrays/from-string');
import * as multiaddr from 'multiaddr';
import { StateHelper } from './StateHelper';
import { BigNumber } from '@gny/utils';
import Loader from './loader';
import { LoaderHelper, PeerIdCommonBlockHeight } from './LoaderHelper';
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

  public static rendezvousBroadcastIfRendezvous = async (
    bootstrapNode: string[]
  ) => {
    async function announce() {
      const span = global.library.tracer.startSpan('rendezvous broadcast');

      const peers = Peer.p2p.getAllConnectedPeersPeerInfo();

      const data = {
        spanId: serializedSpanContext(global.library.tracer, span.context()),
        peers: peers,
      };
      span.log(data);

      const converted = uint8ArrayFromString(JSON.stringify(data));
      await Peer.p2p.rendezvousBroadcastsPeers(converted);

      span.finish();
    }

    // only the rondezvous node should announce the peers it has
    // this replaces the constant announcing yourself to the network
    // which produces far to many messages
    // no peers === I am rendezvous node
    if (bootstrapNode.length === 0) {
      // execute right away
      await announce();
      // execute forever every 10 seconds
      const tenSeconds = 10 * 1000;
      setInterval(announce, tenSeconds);
    }
  };

  public static dialRendezvousNodeIfNotNormalNode = async (
    bootstrapNode: string[]
  ) => {
    // dial to peers in GNY_P2P_PEERS env variable
    // normally this is only the rendezvous node

    async function dial() {
      const multis = bootstrapNode.map(x => multiaddr(x));

      for (let i = 0; i < multis.length; ++i) {
        const m = multis[i];
        const peer = PeerId.createFromB58String(m.getPeerId());

        // check if there are addresses for this peer saved
        const addresses = Peer.p2p.peerStore.addressBook.get(peer);
        if (!addresses) {
          Peer.p2p.peerStore.addressBook.set(peer, [m]);
        }

        // 0. no need to check if already in peerStore (peer always in peerStore)
        // 1. check if have connection
        // yes, then return
        // 2. if not, then dial
        const connections = Array.from(Peer.p2p.connections.keys());
        const inConnection = connections.find(x => x === peer.toB58String());
        if (inConnection) {
          continue; // for next remote peer
        }

        try {
          await Peer.p2p.dial(peer);
        } catch (err) {
          continue; // for next remote peer
        }
      }
    }

    // not rendezvous node
    if (bootstrapNode.length > 0) {
      // execute right away
      await dial();
      // execute forever every 10 seconds
      const tenSeconds = 10 * 1000;
      setInterval(dial, tenSeconds);
    }
  };

  public static syncIfStuck = () => {
    // sync to highest node, especially when the whole network is stuck
    let height30SecondsAgo = String(0);
    setInterval(async () => {
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
        span.finish();
        Loader.startSyncBlocks();
      } else {
        height30SecondsAgo = heightNow;
        return;
      }
    }, 30 * 1000);
  };

  public static checkOtherPeers = async () => {};

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

    // this prevents from processing blocks from peers. Maybe we need rollback?
    StateHelper.SetIsSyncing(true);

    const bootstrapNode = global.library.config.peers.bootstrap
      ? global.library.config.peers.bootstrap
      : [];
    const peerId = await Peer.preparePeerId();

    await Peer.initializeLibP2P(bootstrapNode, peerId);

    // await sleep(2 * 1000);

    await Peer.rendezvousBroadcastIfRendezvous(bootstrapNode);
    await Peer.dialRendezvousNodeIfNotNormalNode(bootstrapNode);

    // Peer.syncIfStuck();

    // wait a little bit for peers
    await sleep(7 * 1000);

    const connectedPeers = Peer.p2p.getAllConnectedPeersPeerInfo();
    if (Array.isArray(connectedPeers) && connectedPeers.length > 0) {
      await Loader.startSyncBlocks();

      await sleep(15 * 1000);
      StateHelper.SetIsSyncing(false);
    } else {
      StateHelper.SetIsSyncing(false);
    }
  };

  public static cleanup = cb => {
    Peer.p2p.stop(cb);
    global.library.logger.debug('Cleaning up core/peer');
  };
}
