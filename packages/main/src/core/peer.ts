import * as _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';
import {
  Wrapper,
  V1_BROADCAST_NEW_BLOCK_HEADER,
  V1_BROADCAST_TRANSACTION,
  V1_BROADCAST_PROPOSE,
  V1_BROADCAST_HELLO,
  V1_BROADCAST_HELLO_BACK,
  attachEventHandlers,
} from '@gny/p2p';
import { PeerNode, ICoreModule } from '@gny/interfaces';
import { attachDirectP2PCommunication } from './PeerHelper';
import Transport from './transport';
import * as PeerId from 'peer-id';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default class Peer implements ICoreModule {
  public static p2p: Wrapper;

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

    const wrapper = new Wrapper(
      global.library.config.publicIp,
      global.library.config.peerPort,
      peerId,
      bootstrapNode,
      global.library.logger
    );
    Peer.p2p = wrapper;
    attachEventHandlers(Peer.p2p, global.library.logger);
    attachDirectP2PCommunication(Peer.p2p);

    global.library.logger.info('[p2p] starting libp2p bundle');

    Peer.p2p
      .start()
      .then(() => {
        global.library.logger.info('[p2p] libp2p started');

        global.library.logger.info(
          `[p2p] publicIp is: ${global.library.config.publicIp}`
        );

        // node1.multiaddrs.map(x => `${x}/ipfs/${node1.peerId.toB58String()}

        // issue #255
        global.library.logger.log(
          `[p2p] listen address: ${Peer.p2p.addressManager
            .getListenAddrs()
            .map(x => `${x}/ipfs/${Peer.p2p.peerId.toB58String()}`)}`
        );
      })
      .then(async () => {
        // subscribe to pubsub topics
        Peer.p2p.subscribeCustom(
          V1_BROADCAST_NEW_BLOCK_HEADER,
          Transport.receivePeer_NewBlockHeader
        );
        Peer.p2p.subscribeCustom(
          V1_BROADCAST_PROPOSE,
          Transport.receivePeer_Propose
        );
        Peer.p2p.subscribeCustom(
          V1_BROADCAST_TRANSACTION,
          Transport.receivePeer_Transaction
        );
        Peer.p2p.subscribeCustom(
          V1_BROADCAST_HELLO,
          Transport.receivePeer_Hello
        );
        Peer.p2p.subscribeCustom(
          V1_BROADCAST_HELLO_BACK,
          Transport.receivePeer_HelloBack
        );

        global.library.logger.info(`[p2p] sleep for 10 seconds`);
        return await sleep(10 * 1000);
      })
      .catch(err => {
        global.library.logger.error('Failed to init dht');
        global.library.logger.error(err);
      });
  };

  public static cleanup = cb => {
    Peer.p2p.stop(cb);
    global.library.logger.debug('Cleaning up core/peer');
  };
}
