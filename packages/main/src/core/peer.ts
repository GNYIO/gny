import * as _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';
import {
  create,
  V1_BROADCAST_NEW_BLOCK_HEADER,
  V1_BROADCAST_TRANSACTION,
  V1_BROADCAST_PROPOSE,
  V1_BROADCAST_NEW_MEMBER,
} from '@gny/p2p';
import { PeerNode, ICoreModule } from '@gny/interfaces';
import * as PeerId from 'peer-id';
import { attachDirectP2PCommunication } from './PeerHelper';
import Transport from './transport';
const uint8ArrayFromString = require('uint8arrays/from-string');

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

  // Events
  public static onBlockchainReady = async () => {
    const peerId = await Peer.preparePeerId();

    // TODO persist peerBook of node
    const bootstrapNode = global.library.config.peers.bootstrap
      ? global.library.config.peers.bootstrap
      : [];

    const wrapper = create(
      peerId,
      global.library.config.publicIp,
      global.library.config.peerPort,
      bootstrapNode,
      global.library.logger
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
      `listenAddresses: ${Peer.p2p.addressManager
        .getListenAddrs()
        .map(x => x.toString())}`
    );
    global.library.logger.info(
      `noAnnounceAddresses: ${Peer.p2p.addressManager
        .getNoAnnounceAddrs()
        .map(x => x.toString())}`
    );

    Peer.p2p.pubsub.on(
      V1_BROADCAST_NEW_BLOCK_HEADER,
      Transport.receivePeer_NewBlockHeader
    );
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_NEW_BLOCK_HEADER);

    Peer.p2p.pubsub.on(V1_BROADCAST_PROPOSE, Transport.receivePeer_Propose);
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_PROPOSE);

    Peer.p2p.pubsub.on(
      V1_BROADCAST_TRANSACTION,
      Transport.receivePeer_Transaction
    );
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_TRANSACTION);

    Peer.p2p.pubsub.on(V1_BROADCAST_NEW_MEMBER, Transport.receiveNew_Member);
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_NEW_MEMBER);

    await sleep(2 * 1000);

    if (bootstrapNode.length > 0) {
      Peer.p2p._discovery.get('bootstrap').on('peer', async peer => {
        // 1. check if have connection
        // yes, then return
        // 2. if not, then dial
        const connection = Peer.p2p.connectionManager.get(peer.id);
        if (connection) {
          // do nothing, already connected
          return;
        }

        try {
          await Peer.p2p.dial(peer.id);
          const data = uint8ArrayFromString(JSON.stringify(peer));
          await Peer.p2p.broadcastNewMember(data);
        } catch (err) {
          global.library.logger.info(
            `[p2p][bootsrap] failed to dial peer ${JSON.stringify(
              peer,
              null,
              2
            )}`
          );
        }
      });
    }
  };

  public static cleanup = cb => {
    Peer.p2p.stop(cb);
    global.library.logger.debug('Cleaning up core/peer');
  };
}
