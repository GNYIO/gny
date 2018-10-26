"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function () { if (t[0] & 1)
            throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return { value: op[1], done: false };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            }
            catch (e) {
                op = [6, e];
                y = 0;
            }
            finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var path = require('path');
var ip = require('ip');
var crypto = require('crypto');
var _ = require('lodash');
var DHT = require('bittorrent-dht');
var request = require('request');
var Router = require('../utils/router.js');
var sandboxHelper = require('../utils/sandbox.js');
var promisify = require('util').promisify;
var Database = require('nedb');
var modules;
var library;
var self;
var SAVE_PEERS_INTERVAL = 1 * 60 * 1000;
var CHECK_BUCKET_OUTDATE = 1 * 60 * 1000;
var MAX_BOOTSTRAP_PEERS = 25;
var priv = {
    handlers: {},
    dht: null,
    getNodeIdentity: function (node) {
        var address = node.host + ":" + node.port;
        return crypto.createHash('ripemd160').update(address).digest().toString('hex');
    },
    getSeedPeerNodes: function (seedPeers) {
        return seedPeers.map(function (peer) {
            var node = { host: peer.ip, port: Number(peer.port) };
            node.id = priv.getNodeIdentity(node);
            return node;
        });
    },
    getBootstrapNodes: function (seedPeers, lastNodes, maxCount) {
        var nodeMap = new Map();
        priv.getSeedPeerNodes(seedPeers).forEach(function (node) { return nodeMap.set(node.id, node); });
        lastNodes.forEach(function (node) {
            if (!nodeMap.has(node.id)) {
                nodeMap.set(node.id, node);
            }
        });
        return nodeMap.values().slice().slice(0, maxCount);
    },
    initDHT: function (p2pOptions) {
        return __awaiter(_this, void 0, void 0, function () {
            var lastNodes, peerNodesDbPath, e_1, bootstrapNodes, dht, port;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        p2pOptions = p2pOptions || {};
                        lastNodes = [];
                        if (!p2pOptions.persistentPeers)
                            return [3, 4];
                        peerNodesDbPath = path.join(p2pOptions.peersDbDir, 'peers.db');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4, promisify(priv.initNodesDb)(peerNodesDbPath)];
                    case 2:
                        lastNodes = _a.sent();
                        lastNodes = lastNodes || [];
                        app.logger.debug("load last node peers success, " + JSON.stringify(lastNodes));
                        return [3, 4];
                    case 3:
                        e_1 = _a.sent();
                        app.logger.error('Last nodes not found', e_1);
                        return [3, 4];
                    case 4:
                        bootstrapNodes = priv.getBootstrapNodes(p2pOptions.seedPeers, lastNodes, MAX_BOOTSTRAP_PEERS);
                        dht = new DHT({
                            timeBucketOutdated: CHECK_BUCKET_OUTDATE,
                            bootstrap: true,
                            id: priv.getNodeIdentity({ host: p2pOptions.publicIp, port: p2pOptions.peerPort })
                        });
                        priv.dht = dht;
                        port = p2pOptions.peerPort;
                        dht.listen(port, function () { return library.logger.info("p2p server listen on " + port); });
                        dht.on('node', function (node) {
                            var nodeId = node.id.toString('hex');
                            library.logger.info("add node (" + nodeId + ") " + node.host + ":" + node.port);
                            priv.updateNode(nodeId, node);
                        });
                        dht.on('remove', function (nodeId, reason) {
                            library.logger.info("remove node (" + nodeId + "), reason: " + reason);
                            priv.removeNode(nodeId);
                        });
                        dht.on('error', function (err) {
                            library.logger.warn('dht error message', err);
                        });
                        dht.on('warning', function (msg) {
                            library.logger.warn('dht warning message', msg);
                        });
                        if (p2pOptions.eventHandlers)
                            Object.keys(p2pOptions.eventHandlers).forEach(function (eventName) {
                                return dht.on(eventName, p2pOptions.eventHandlers[eventName]);
                            });
                        bootstrapNodes.forEach(function (n) { return dht.addNode(n); });
                        return [2];
                }
            });
        });
    },
    findSeenNodesInDb: function (callback) {
        priv.nodesDb.find({ seen: { $exists: true } }).sort({ seen: -1 }).exec(callback);
    },
    initNodesDb: function (peerNodesDbPath, cb) {
        if (!priv.nodesDb) {
            var db = new Database({ filename: peerNodesDbPath, autoload: true });
            priv.nodesDb = db;
            db.persistence.setAutocompactionInterval(SAVE_PEERS_INTERVAL);
            var errorHandler = function (err) { return err && app.logger.info('peer node index error', err); };
            db.ensureIndex({ fieldName: 'id' }, errorHandler);
            db.ensureIndex({ fieldName: 'seen' }, errorHandler);
        }
        priv.findSeenNodesInDb(cb);
    },
    updateNode: function (nodeId, node, callback) {
        if (!nodeId || !node)
            return;
        var upsertNode = Object.assign({}, node);
        upsertNode.id = nodeId;
        priv.nodesDb.update({ id: nodeId }, upsertNode, { upsert: true }, function (err, data) {
            if (err)
                app.logger.warn("faild to update node (" + nodeId + ") " + node.host + ":" + node.port);
            callback && callback(err, data);
        });
    },
    removeNode: function (nodeId, callback) {
        if (!nodeId)
            return;
        priv.nodesDb.remove({ id: nodeId }, function (err, numRemoved) {
            if (err)
                app.logger.warn("faild to remove node id (" + nodeId + ")");
            callback && callback(err, numRemoved);
        });
    }
};
var shared = {};
function Peer(cb, scope) {
    library = scope;
    self = this;
    priv.attachApi();
    setImmediate(cb, null, self);
}
priv.attachApi = function () {
    var router = new Router();
    router.use(function (req, res, next) {
        if (modules)
            return next();
        return es.status(500).send({ success: false, error: 'Blockchain is loading' });
    });
    router.map(shared, {
        'get /': 'getPeers',
        'get /version': 'version',
        'get /get': 'getPeer',
    });
    router.use(function (req, res) {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
    });
    library.network.app.use('/api/peers', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
Peer.prototype.list = function (options, cb) {
    options.limit = options.limit || 100;
    return cb(null, []);
};
Peer.prototype.remove = function (pip, port, cb) {
    var peers = library.config.peers.list;
    var isFrozenList = peers.find(function (peer) { return peer.ip === ip.fromLong(pip) && peer.port === port; });
    if (isFrozenList !== undefined)
        return cb && cb('Peer in white list');
    return cb();
};
Peer.prototype.addChain = function (config, cb) {
    cb();
};
Peer.prototype.getVersion = function () {
    return ({
        version: library.config.version,
        build: library.config.buildVersion,
        net: library.config.netVersion,
    });
};
Peer.prototype.isCompatible = function (version) {
    var nums = version.split('.').map(Number);
    if (nums.length !== 3) {
        return true;
    }
    var compatibleVersion = '0.0.0';
    if (library.config.netVersion === 'testnet') {
        compatibleVersion = '1.2.3';
    }
    else if (library.config.netVersion === 'mainnet') {
        compatibleVersion = '1.3.1';
    }
    var numsCompatible = compatibleVersion.split('.').map(Number);
    for (var i = 0; i < nums.length; ++i) {
        if (nums[i] < numsCompatible[i]) {
            return false;
        }
        if (nums[i] > numsCompatible[i]) {
            return true;
        }
    }
    return true;
};
Peer.prototype.subscribe = function (topic, handler) {
    priv.handlers[topic] = handler;
};
Peer.prototype.onpublish = function (msg, peer) {
    if (!msg || !msg.topic || !priv.handlers[msg.topic.toString()]) {
        library.logger.debug('Receive invalid publish message topic', msg);
        return;
    }
    priv.handlers[msg.topic](msg, peer);
};
Peer.prototype.publish = function (topic, message, recursive) {
    if (recursive === void 0) {
        recursive = 1;
    }
    if (!priv.dht) {
        library.logger.warn('dht network is not ready');
        return;
    }
    message.topic = topic;
    message.recursive = recursive;
    priv.dht.broadcast(message);
};
Peer.prototype.request = function (method, params, contact, cb) {
    var address = contact.host + ":" + (contact.port - 1);
    var uri = "http://" + address + "/peer/" + method;
    library.logger.debug("start to request " + uri);
    var reqOptions = {
        uri: uri,
        method: 'POST',
        body: params,
        headers: {
            magic: global.Config.magic,
            version: global.Config.version,
        },
        json: true,
    };
    request(reqOptions, function (err, response, result) {
        if (err) {
            return cb("Failed to request remote peer: " + err);
        }
        else if (response.statusCode !== 200) {
            library.logger.debug('remote service error', result);
            return cb("Invalid status code: " + response.statusCode);
        }
        return cb(null, result);
    });
};
Peer.prototype.randomRequest = function (method, params, cb) {
    var randomNode = priv.dht.getRandomNode();
    if (!randomNode)
        return cb('No contact');
    library.logger.debug('select random contract', randomNode);
    var isCallbacked = false;
    setTimeout(function () {
        if (isCallbacked)
            return;
        isCallbacked = true;
        cb('Timeout', undefined, randomNode);
    }, 4000);
    return self.request(method, params, randomNode, function (err, result) {
        if (isCallbacked)
            return;
        isCallbacked = true;
        cb(err, result, randomNode);
    });
};
Peer.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Peer.prototype.onBind = function (scope) {
    modules = scope;
};
Peer.prototype.onBlockchainReady = function () {
    priv.initDHT({
        publicIp: library.config.publicIp,
        peerPort: library.config.peerPort,
        seedPeers: library.config.peers.list,
        persistentPeers: library.config.peers.persistent === false ? false : true,
        peersDbDir: global.Config.dataDir,
        eventHandlers: {
            'broadcast': function (msg, node) { return self.onpublish(msg, node); }
        }
    }).then(function () {
        library.bus.message('peerReady');
    }).catch(function (err) {
        library.logger.error('Failed to init dht', err);
    });
};
shared.getPeers = function (req, cb) {
    priv.findSeenNodesInDb(function (err, nodes) {
        var peers = [];
        if (err) {
            library.logger.error('Failed to find nodes in db', err);
        }
        else {
            peers = nodes;
        }
        cb(null, { count: peers.length, peers: peers });
    });
};
shared.getPeer = function (req, cb) {
    cb(null, {});
};
shared.version = function (req, cb) {
    cb(null, {
        version: library.config.version,
        build: library.config.buildVersion,
        net: library.config.netVersion,
    });
};
module.exports = Peer;
