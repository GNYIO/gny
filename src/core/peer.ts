import * as _ from 'lodash';
import axios from 'axios';
import * as Database from 'nedb';
import * as fs from 'fs';
import {
  createPeerInfoArgs,
  createFromJSON,
} from '../../packages/p2p/createPeerInfo';
import { Peer2Peer } from '../../packages/p2p/index';
import { Modules, IScope, PeerNode } from '../interfaces';

export default class Peer {
  private readonly library: IScope;
  private modules: Modules;
  private nodesDb: Database = undefined;

  public p2p: Peer2Peer;
  constructor(scope: IScope) {
    this.library = scope;
  }

  public findSeenNodesInDb = (callback: any) => {
    this.nodesDb
      .find({ seen: { $exists: true } })
      .sort({ seen: -1 })
      .exec(callback);
  };

  public getVersion = () => ({
    version: this.library.config.version,
    build: this.library.config.buildVersion,
    net: this.library.config.netVersion,
  });

  public request = async (
    endpoint: string,
    body: any,
    contact: PeerNode,
    timeout?: number
  ) => {
    const address = `${contact.host}:${contact.port - 1}`;
    const uri = `http://${address}/peer/${endpoint}`;
    this.library.logger.debug(`start to request ${uri}`);
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
      this.library.logger.error(
        `Failed to request remote peer: ${err.message}`
      );
      throw err;
    }
  };

  public randomRequestAsync = async (method: string, params: any) => {
    const randomNode = this.p2p.getRandomNode();
    if (!randomNode) throw new Error('no contact');
    this.library.logger.debug('select random contract', randomNode);
    try {
      const result = await this.request(method, params, randomNode, 4000);
      return {
        data: result,
        node: randomNode,
      };
    } catch (err) {
      throw err;
    }
  };

  public preparePeerInfo = async (rawPeerInfo: string) => {
    const KEY = JSON.parse(rawPeerInfo);

    const peerId = await createFromJSON(KEY);
    const peerInfo = await createPeerInfoArgs(peerId);

    const multi = `/ip4/${this.library.config.publicIp}/tcp/${
      this.library.config.peerPort
    }`;
    peerInfo.multiaddrs.add(multi);
    return peerInfo;
  };

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope;
  };

  onBlockchainReady = async () => {
    const peerInfo = await this.preparePeerInfo(
      this.library.config.peers.rawPeerInfo
    );

    // TODO persist peerBook of node
    this.p2p = new Peer2Peer(
      global.app.logger,
      peerInfo,
      this.library.config.peers.bootstrap
    );
    this.p2p
      .startAsync()
      .then(() => {
        this.library.bus.message('onPeerReady');
      })
      .catch(err => {
        this.library.logger.error('Failed to init dht', err);
      });
  };

  cleanup = cb => {
    this.p2p.stop(cb);
    this.library.logger.debug('Cleaning up core/peer');
  };
}
