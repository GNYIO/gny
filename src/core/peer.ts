import * as path from 'path';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import axios from 'axios';
import { promisify } from 'util';
import Database = require('nedb');
import { Peer2Peer } from '../../packages/p2p/index';
import { Modules, IScope, PeerNode } from '../interfaces';
import { SAVE_PEERS_INTERVAL, CHECK_BUCKET_OUTDATE, MAX_BOOTSTRAP_PEERS } from '../utils/constants';

export default class Peer {
  private readonly library: IScope;
  private modules: Modules;

  private handlers: any = {};
  private nodesDb: Database = undefined;

  public p2p: Peer2Peer;
  constructor (scope: IScope) {
    this.library = scope;
  }

  private getNodeIdentity = (node: PeerNode) => {
    const address = `${node.host}:${node.port}`;
    return crypto.createHash('ripemd160').update(address).digest().toString('hex');
  }

  private getSeedPeerNodes = (seedPeers) => {
    return seedPeers.map(peer => {
      const node: PeerNode = {
        host: peer.ip,
        port: Number(peer.port),
      };
      node.id = this.getNodeIdentity(node);
      return node;
    });
  }


  public findSeenNodesInDb = (callback: any) => {
    this.nodesDb.find({ seen: { $exists: true } }).sort({ seen: -1 }).exec(callback);
  }

  private initNodesDb = (peerNodesDbPath: string, cb: any) => {
    if (!this.nodesDb) {
      const db = new Database({ filename: peerNodesDbPath, autoload: true });
      this.nodesDb = db;
      db.persistence.setAutocompactionInterval(SAVE_PEERS_INTERVAL);

      const errorHandler = (err) => err && global.app.logger.info('peer node index error', err);
      db.ensureIndex({ fieldName: 'id' }, errorHandler);
      db.ensureIndex({ fieldName: 'seen' }, errorHandler);
    }

    this.findSeenNodesInDb(cb);
  }


  // DB
  private updateNodeInDb = (nodeId: any, node: any, callback?: any) => {
    if (!nodeId || !node) return;

    const upsertNode = Object.assign({}, node);
    upsertNode.id = nodeId;
    this.nodesDb.update({ id: nodeId }, upsertNode, { upsert: true }, (err, data) => {
      if (err) global.app.logger.warn(`faild to update node (${nodeId}) ${node.host}:${node.port}`);
      callback && callback(err, data);
    });
  }

  // DB
  private removeNodeFromDb = (nodeId: any, callback?: any) => {
    if (!nodeId) return;

    this.nodesDb.remove({ id: nodeId }, (err, numRemoved) => {
      if (err) global.app.logger.warn(`faild to remove node id (${nodeId})`);
      callback && callback(err, numRemoved);
    });
  }

  public getVersion = () => ({
    version: this.library.config.version,
    build: this.library.config.buildVersion,
    net: this.library.config.netVersion,
    // return own peerId
  })

  public subscribe = (topic: string, handler: (message: string) => void) => {
    if (!this.p2p) {
      console.log('p2p node not ready');
      return;
    }
    this.p2p.subscribe(topic, handler);
  }

  public async broadcastNewBlockHeaderAsync(data) {
    await this.p2p.broadcastNewBlockHeaderAsync(data);
  }

  public async broadcastProposeAsync(data) {
    await this.p2p.broadcastProposeAsync(data);
  }

  public async broadcastTransaction(data) {
    await this.p2p.broadcastTransactionAsync;
  }

  public request = async (endpoint: string, body: any, contact: PeerNode, timeout?: number) => {
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
        timeout: undefined || timeout
      };
      result = await axios.post(uri, body, config);
      if (result.status !== 200) {
        throw new Error(`Invalid status code: ${result.statusCode}, error: ${result.data}`);
      }
      return result.data;
    } catch (err) {
      this.library.logger.error(`Failed to request remote peer: ${err.message}`);
      throw err;
    }
  }

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
  }

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope;
  }

  onBlockchainReady = async () => {
    // TODO persist peerBook of node
    this.p2p = new Peer2Peer();
    this.p2p.start(
      this.library.config.publicIp,
      this.library.config.peerPort,
      this.library.config.peers.bootstrap,
    ).then(() => {
      this.library.bus.message('peerReady');
    }).catch((err) => {
      this.library.logger.error('Failed to init dht', err);
    });
  }
}
