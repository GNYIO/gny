import * as _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';
import {
  createPeerInfoArgs,
  createFromJSON,
  createFromPrivKey,
  Bundle,
  attachEventHandlers,
} from '@gny/p2p';
import { PeerNode, ICoreModule, SimplePeerId } from '@gny/interfaces';

export default class Peer implements ICoreModule {
  public static p2p: Bundle;

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
      throw err;
    }
  };

  public static randomRequestAsync = async (method: string, params: any) => {
    const randomNode = Peer.p2p.getConnectedRandomNode();
    if (!randomNode) throw new Error('no contact');
    global.library.logger.debug('select random contract', randomNode);
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

  public static preparePeerInfo = async (rawPeerInfo: string) => {
    const KEY = JSON.parse(rawPeerInfo);

    let peerId: any;
    if (global.library.config.peers.privateP2PKey) {
      const buf = Buffer.from(
        global.library.config.peers.privateP2PKey,
        'base64'
      );
      peerId = await createFromPrivKey(buf);
    } else {
      peerId = await createFromJSON(KEY);
    }

    const peerInfo = await createPeerInfoArgs(peerId);

    const multi = `/ip4/${global.library.config.address}/tcp/${
      global.library.config.peerPort
    }`;
    peerInfo.multiaddrs.add(multi);

    return peerInfo;
  };

  // Events
  public static onBlockchainReady = async () => {
    const peerInfo = await Peer.preparePeerInfo(
      global.library.config.peers.rawPeerInfo
    );

    // TODO persist peerBook of node
    const bootstrapNode = global.library.config.peers.bootstrap
      ? global.library.config.peers.bootstrap
      : [];
    const config = {
      peerInfo,
      config: {
        peerDiscovery: {
          bootstrap: {
            list: bootstrapNode,
          },
        },
      },
    };

    Peer.p2p = new Bundle(config, global.app.logger);
    attachEventHandlers(Peer.p2p, global.app.logger);

    Peer.p2p
      .start()
      .then(() => {
        // test
        Peer.p2p.peerInfo.multiaddrs.delete(
          Peer.p2p.peerInfo.multiaddrs.toArray()[0]
        );
        const multi2 = `/ip4/${global.library.config.publicIp}/tcp/${
          global.library.config.peerPort
        }/ipfs/${Peer.p2p.peerInfo.id.toB58String()}`;
        Peer.p2p.peerInfo.multiaddrs.add(multi2);

        global.library.bus.message('onPeerReady');
      })
      .catch(err => {
        global.library.logger.error('Failed to init dht', err);
      });
  };

  public static cleanup = cb => {
    Peer.p2p.stop(cb);
    global.library.logger.debug('Cleaning up core/peer');
  };
}
