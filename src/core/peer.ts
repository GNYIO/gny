import * as _ from 'lodash';
import axios from 'axios';
import * as Database from 'nedb';
import {
  createPeerInfoArgs,
  createFromJSON,
} from '../../packages/p2p/createPeerInfo';
import { Bundle } from '../../packages/p2p/bundle';
import { PeerNode } from '../../packages/interfaces';
import { attachEventHandlers } from '../../packages/p2p/util';

export default class Peer {
  private static nodesDb: Database = undefined; // TODO: refactor

  public static p2p: Bundle;

  public static findSeenNodesInDb = (callback: any) => {
    throw new Error('not implemented');
    Peer.nodesDb
      .find({ seen: { $exists: true } })
      .sort({ seen: -1 })
      .exec(callback);
  };

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
      const config = {
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
    const randomNode = Peer.p2p.getRandomNode();
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

    const peerId = await createFromJSON(KEY);
    const peerInfo = await createPeerInfoArgs(peerId);

    const multi = `/ip4/${global.library.config.publicIp}/tcp/${
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
      ? [global.library.config.peers.bootstrap]
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
