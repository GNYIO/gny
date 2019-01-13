import * as path from 'path';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import DHT = require('bittorrent-dht');
import requestLib = require('request');
import axios from 'axios';
import { promisify } from 'util';
import Database = require('nedb');
import { Modules, IScope, PeerNode } from '../interfaces';
const SAVE_PEERS_INTERVAL = 1 * 60 * 1000;
const CHECK_BUCKET_OUTDATE = 1 * 60 * 1000;
const MAX_BOOTSTRAP_PEERS = 25;

export default class Peer {
  private readonly library: IScope;
  private modules: Modules;

  private handlers: any = {};
  private dht: any = null;
  private nodesDb: Database = undefined;

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

  private getBootstrapNodes = (seedPeers: PeerNode[], lastNodes: any[]) => {
    const nodeMap = new Map();
    this.getSeedPeerNodes(seedPeers).forEach(node => nodeMap.set(node.id, node));
    lastNodes.forEach(node => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    });
    return [...nodeMap.values()].slice(0, MAX_BOOTSTRAP_PEERS) as PeerNode[];
  }

  private initDHT = async (p2pOptions: any) => {
    p2pOptions = p2pOptions || {};

    let lastNodes = [];
    if (p2pOptions.persistentPeers) {
      const peerNodesDbPath = path.join(p2pOptions.peersDbDir, 'peers.db');
      try {
        lastNodes = await promisify(this.initNodesDb)(peerNodesDbPath);
        lastNodes = lastNodes || [];
        global.app.logger.debug(`load last node peers success, ${JSON.stringify(lastNodes)}`);
      } catch (e) {
        global.app.logger.error('Last nodes not found', e);
      }
    }
    const bootstrapNodes = this.getBootstrapNodes(
      p2pOptions.seedPeers,
      lastNodes,
    );

    const idForThisNode = this.getNodeIdentity({
      host: p2pOptions.publicIp,
      port: p2pOptions.peerPort,
    });

    const dht = new DHT({
      timeBucketOutdated: CHECK_BUCKET_OUTDATE,
      bootstrap: true,
      id: idForThisNode,
    });
    this.dht = dht;

    const port = p2pOptions.peerPort;
    dht.listen(port, () => {
      this.library.logger.info(`p2p server listen on ${port}`);
    });

    dht.on('node', (node: any) => {
      const nodeId = node.id.toString('hex');
      this.library.logger.info(`add node (${nodeId}) ${node.host}:${node.port}`);
      this.updateNodeInDb(nodeId, node);
    });

    dht.on('remove', (nodeId, reason) => {
      this.library.logger.info(`remove node (${nodeId}), reason: ${reason}`);
      this.removeNodeFromDb(nodeId);
    });

    dht.on('error', (err) => {
      this.library.logger.warn('dht error message', err);
    });

    dht.on('warning', (msg: any) => {
      this.library.logger.warn('dht warning message', msg);
    });

    if (p2pOptions.eventHandlers) Object.keys(p2pOptions.eventHandlers).forEach(eventName =>
      dht.on(eventName, p2pOptions.eventHandlers[eventName])
    );

    bootstrapNodes.forEach(n => dht.addNode(n));
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
  })

  public subscribe = (topic: any, handler: any) => {
    this.handlers[topic] = handler;
  }

  private onpublish = (msg: any, peer: any) => {
    if (!msg || !msg.topic || !this.handlers[msg.topic.toString()]) {
      this.library.logger.debug('Receive invalid publish message topic', msg);
      return;
    }
    this.handlers[msg.topic](msg, peer);
  }

  public publish = (topic: string, message: any, recursive = 1) => {
    if (!this.dht) {
      this.library.logger.warn('dht network is not ready');
      return;
    }
    message.topic = topic;
    message.recursive = recursive;
    this.dht.broadcast(message);
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

  public requestCB = (method: any, params: any, contact: any, cb: any) => {
    const address = `${contact.host}:${contact.port - 1}`;
    const uri = `http://${address}/peer/${method}`;
    this.library.logger.debug(`start to request ${uri}`);
    const reqOptions = {
      uri,
      method: 'POST',
      body: params,
      headers: {
        magic: global.Config.magic,
        version: global.Config.version,
      },
      json: true,
    };
    requestLib(reqOptions, (err, response, result) => {
      if (err) {
        return cb(`Failed to request remote peer: ${err}`);
      } else if (response.statusCode !== 200) {
        this.library.logger.debug('remote service error', result);
        return cb(`Invalid status code: ${response.statusCode}`);
      }
      return cb(null, result);
    });
  }

  public randomRequestAsync = async (method: string, params: any) => {
    const randomNode = this.dht.getRandomNode();
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

  public randomRequest = (method: any, params: any, cb: any) => {
    const randomNode = this.dht.getRandomNode();
    if (!randomNode) return cb('No contact');
    this.library.logger.debug('select random contract', randomNode);
    let isCallbacked = false;
    setTimeout(() => {
      if (isCallbacked) return;
      isCallbacked = true;
      cb('Timeout', undefined, randomNode);
    }, 4000);
    return this.requestCB(method, params, randomNode, (err, result) => {
      if (isCallbacked) return;
      isCallbacked = true;
      cb(err, result, randomNode);
    });
  }

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope;
  }

  onBlockchainReady = () => {
    this.initDHT({
      publicIp: this.library.config.publicIp,
      peerPort: this.library.config.peerPort,
      seedPeers: this.library.config.peers.list,
      persistentPeers: this.library.config.peers.persistent === false ? false : true,
      peersDbDir: global.Config.dataDir,
      eventHandlers: {
        'broadcast': (msg, node) => this.onpublish(msg, node)
      }
    }).then(() => {
      this.library.bus.message('peerReady');
    }).catch(err => {
      this.library.logger.error('Failed to init dht', err);
    });
  }
}
