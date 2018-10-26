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
var async = require('async');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Sandbox = require('asch-sandbox');
var rmdir = require('rimraf');
var Router = require('../utils/router.js');
var sandboxHelper = require('../utils/sandbox.js');
var modules;
var library;
var self;
var priv = {};
var shared = {};
priv.launched = {};
priv.loading = {};
priv.removing = {};
priv.unconfirmedNames = {};
priv.unconfirmedLinks = {};
priv.unconfirmedAscii = {};
priv.baseDir = '';
priv.chainBaseDir = '';
priv.sandboxes = {};
priv.chainReady = {};
priv.routes = {};
priv.unconfirmedOutTansfers = {};
priv.defaultRouteId = null;
function Chains(cb, scope) {
    library = scope;
    self = this;
    priv.baseDir = library.config.baseDir;
    priv.chainBaseDir = path.join(priv.baseDir, 'chains');
    priv.attachApi();
    fs.exists(path.join(library.config.publicDir, 'chains'), function (exists) {
        if (exists) {
            rmdir(path.join(library.config.publicDir, 'chains'), function (err) {
                if (err) {
                    library.logger.error(err);
                }
                priv.createBasePathes(function (err2) {
                    setImmediate(cb, err2, self);
                });
            });
        }
        else {
            priv.createBasePathes(function (err) {
                setImmediate(cb, err, self);
            });
        }
    });
}
priv.attachApi = function () {
    var router = new Router();
    router.use(function (req, res, next) {
        if (modules)
            return next();
        return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });
    router.get('/installed', function (req, res) {
        priv.getInstalledIds(function (err, files) {
            if (err) {
                library.logger.error('Failed to get installed chain ids', err);
                return res.json({ success: false, error: 'Server error' });
            }
            if (files.length === 0) {
                return res.json({ success: true, chain: [] });
            }
            return priv.getByNames(files, function (err2, chains) {
                if (err2) {
                    library.logger.error('Failed to get installed chains', err2);
                    return res.json({ success: false, error: 'Server error' });
                }
                return res.json({ success: true, chains: chains });
            });
        });
    });
    router.get('/installedIds', function (req, res) {
        priv.getInstalledIds(function (err, files) {
            if (err) {
                library.logger.error('Failed to get installed ids', err);
                return res.json({ success: false, error: 'Server error' });
            }
            return res.json({ success: true, ids: files });
        });
    });
    library.network.app.use('/api/chains', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
priv.get = function (name, cb) {
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var chain, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4, priv.getChainByName(name)];
                    case 1:
                        chain = _a.sent();
                        if (!chain)
                            return [2, cb('Chain not found')];
                        return [2, cb(null, chain)];
                    case 2:
                        e_1 = _a.sent();
                        library.logger.error('Failed to get chain by name', e_1);
                        return [2, cb('Failed to get chain')];
                    case 3: return [2];
                }
            });
        });
    })();
};
priv.getByNames = function (names, cb) {
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var chains;
            return __generator(this, function (_a) {
                try {
                    chains = app.sdb.getAll('Chain', function (c) { return names.includes(c.name); });
                    return [2, cb(null, chains)];
                }
                catch (e) {
                    library.logger.error(e);
                    return [2, cb('Failed to get chains')];
                }
                return [2];
            });
        });
    })();
};
priv.createBasePathes = function (cb) {
    async.series([
        function (next) {
            fs.exists(priv.chainBaseDir, function (exists) {
                if (exists) {
                    return setImmediate(next);
                }
                return fs.mkdir(priv.chainBaseDir, next);
            });
        },
        function (next) {
            var chainPublic = path.join(priv.baseDir, 'public', 'dist', 'chains');
            fs.exists(chainPublic, function (exists) {
                if (exists) {
                    return setImmediate(next);
                }
                return fs.mkdir(chainPublic, cb);
            });
        },
    ], function (err) {
        setImmediate(cb, err);
    });
};
priv.getInstalledIds = function (cb) {
    fs.readdir(priv.chainBaseDir, cb);
};
priv.symlink = function (chain, cb) {
    var chainPath = path.join(priv.chainBaseDir, chain.name);
    var chainPublicPath = path.resolve(chainPath, 'public');
    var chainPublicLink = path.resolve(priv.baseDir, 'public', 'dist', 'chains', chain.name);
    fs.exists(chainPublicPath, function (exists) {
        if (exists) {
            return fs.exists(chainPublicLink, function (linkEists) {
                if (linkEists) {
                    return setImmediate(cb);
                }
                return fs.symlink(chainPublicPath, chainPublicLink, cb);
            });
        }
        return setImmediate(cb);
    });
};
priv.apiHandler = function (message, callback) {
    try {
        var strs = message.call.split('#');
        var mod = strs[0];
        var call = strs[1];
        if (!modules[mod]) {
            return setImmediate(callback, "Invalid module in call: " + message.call);
        }
        if (!modules[mod].sandboxApi) {
            return setImmediate(callback, 'This module doesn\'t have sandbox api');
        }
        return modules[mod].sandboxApi(call, { body: message.args, chain: message.chain }, callback);
    }
    catch (e) {
        return setImmediate(callback, "Invalid call " + e.toString());
    }
};
priv.chainRoutes = function (chain, cb) {
    var routes = Sandbox.routes;
    priv.routes[chain.name] = new Router();
    priv.routes[chain.tid] = new Router();
    routes.forEach(function (router) {
        if (router.method === 'get' || router.method === 'post' || router.method === 'put') {
            var handler = function (req, res) {
                var reqParams = {
                    query: (router.method === 'get') ? req.query : req.body,
                    params: req.params,
                };
                self.request(chain.name, router.method, router.path, reqParams, function (error, body) {
                    var err = error;
                    if (!err && body.error) {
                        err = body.error;
                    }
                    if (err) {
                        return res.json({ error: err.toString() });
                    }
                    body.success = true;
                    return res.json(body);
                });
            };
            priv.routes[chain.name][router.method](router.path, handler);
            priv.routes[chain.tid][router.method](router.path, handler);
        }
    });
    if (!priv.defaultRouteId) {
        priv.defaultRouteId = chain.name;
        library.network.app.use('/api/chains/default/', priv.routes[chain.name]);
    }
    library.network.app.use("/api/chains/" + chain.name + "/", priv.routes[chain.name]);
    library.network.app.use("/api/chains/" + chain.tid + "/", priv.routes[chain.name]);
    library.network.app.use("/api/dapps/" + chain.name + "/", priv.routes[chain.name]);
    library.network.app.use("/api/dapps/" + chain.tid + "/", priv.routes[chain.name]);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
    return setImmediate(cb);
};
priv.launch = function (body, cb) {
    library.scheme.validate(body, {
        type: 'object',
        properties: {
            params: {
                type: 'array',
                minLength: 1,
            },
            name: {
                type: 'string',
                minLength: 1,
            },
            master: {
                type: 'string',
                minLength: 0,
            },
        },
        required: ['name'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        if (priv.launched[body.name]) {
            return cb('Chain already launched');
        }
        body.params = body.params || [''];
        return async.auto({
            chain: async.apply(priv.get, body.name),
            installedIds: async.apply(priv.getInstalledIds),
            symlink: ['chain', 'installedIds', function (next, results) {
                    if (results.installedIds.indexOf(body.name) < 0) {
                        return next('Chain not installed');
                    }
                    return priv.symlink(results.chain, next);
                }],
            launch: ['symlink', function (next, results) {
                    priv.launchApp(results.chain, body.params, next);
                }],
            route: ['launch', function (next, results) {
                    priv.chainRoutes(results.chain, function (err2) {
                        if (err2) {
                            return priv.stop(results.chain, next);
                        }
                        return next();
                    });
                }],
        }, function (err3) {
            if (err3) {
                library.logger.error("Failed to launch chain " + body.name + ": " + err3);
                cb('Failed to launch chain');
            }
            else {
                priv.launched[body.name] = true;
                cb();
            }
        });
    });
};
priv.readJson = function (file, cb) {
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            return cb(err);
        }
        try {
            return cb(null, JSON.parse(data));
        }
        catch (e) {
            return cb(e.toString());
        }
    });
};
priv.launchApp = function (chain, params, cb) {
    var chainPath = path.join(priv.chainBaseDir, chain.name);
    var sandbox = new Sandbox(chainPath, chain.name, params, priv.apiHandler, true, library.logger);
    priv.sandboxes[chain.name] = sandbox;
    sandbox.on('exit', function (code) {
        library.logger.info("Chain " + chain.name + " exited with code " + code);
        priv.stop(chain);
    });
    sandbox.on('error', function (err3) {
        library.logger.info("Encountered error in chain " + chain.name + ": " + err3.toString());
        priv.stop(chain);
    });
    sandbox.run();
    return cb(null);
};
priv.stop = function (chain) {
    if (priv.sandboxes[chain.name]) {
        priv.sandboxes[chain.name].exit();
    }
    delete priv.sandboxes[chain.name];
    delete priv.routes[chain.name];
};
Chains.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Chains.prototype.message = function (chain, body, cb) {
    self.request(chain, 'post', '/message', { query: body }, cb);
};
Chains.prototype.getInstalledIds = function (cb) {
    priv.getInstalledIds(cb);
};
Chains.prototype.request = function (chain, method, uriPath, query, cb) {
    if (!priv.sandboxes[chain]) {
        return cb('Chain not found');
    }
    if (!priv.chainReady[chain]) {
        return cb('Chain not ready');
    }
    return priv.sandboxes[chain].sendMessage({
        method: method,
        path: uriPath,
        query: query,
    }, cb);
};
Chains.prototype.onBind = function (scope) {
    modules = scope;
};
Chains.prototype.cleanup = function (cb) {
    var chains = Object.keys(priv.launched);
    for (var _i = 0, chains_1 = chains; _i < chains_1.length; _i++) {
        var chain = chains_1[_i];
        priv.stop(chain);
    }
    library.logger.info('all chains stopped successfully');
    cb();
};
Chains.prototype.onBlockchainReady = function () {
    priv.getInstalledIds(function (err, chains) {
        library.logger.debug('find local installed chains', chains);
        if (err) {
            library.logger.error('Failed to get installed ids', err);
            return;
        }
        library.logger.info("start to launch " + chains.length + " installed chains");
        async.eachSeries(chains, function (chain, next) {
            priv.launch({ name: chain, params: [] }, function (err2) {
                if (err2) {
                    library.logger.error("Failed to launched chain[" + chain + "]", err2);
                }
                else {
                    library.logger.info("Launched chain[" + chain + "] successfully");
                }
                next();
            });
        });
    });
};
Chains.prototype.onDeleteBlocksBefore = function (block) {
    Object.keys(priv.sandboxes).forEach(function (chain) {
        var req = {
            query: {
                topic: 'rollback',
                message: { pointId: block.id, pointHeight: block.height },
            },
        };
        self.request(chain, 'post', '/message', req, function (err) {
            if (err) {
                library.logger.error('onDeleteBlocksBefore message', err);
            }
        });
    });
};
Chains.prototype.onProcessBlock = function (block) {
    var req = {
        query: {
            topic: 'point',
            message: { id: block.id, height: block.height },
        },
    };
    Object.keys(priv.sandboxes).forEach(function (chain) {
        self.request(chain, 'post', '/message', req, function (err) {
            if (err) {
                library.logger.error('chain response for message onNewBlock', err);
            }
        });
    });
};
priv.getChainByName = function (name) {
    return __awaiter(_this, void 0, void 0, function () {
        var chain;
        return __generator(this, function (_a) {
            chain = app.sdb.get('Chain', { name: name });
            return [2, chain];
        });
    });
};
shared.getChain = function (req, cb) {
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var chain, delegates, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4, priv.getChainByName(req.chain)];
                    case 1:
                        chain = _a.sent();
                        if (!chain)
                            return [2, cb('Not found')];
                        chain = _.clone(chain);
                        return [4, app.sdb.findAll('ChainDelegate', { condition: { chain: req.chain } })];
                    case 2:
                        delegates = _a.sent();
                        if (delegates && delegates.length) {
                            chain.delegates = delegates.map(function (d) { return d.delegate; });
                        }
                        return [2, cb(null, chain)];
                    case 3:
                        e_2 = _a.sent();
                        library.logger.error(e_2);
                        return [2, cb("Failed to find chain: " + e_2)];
                    case 4: return [2];
                }
            });
        });
    })();
};
shared.setReady = function (req, cb) {
    priv.chainReady[req.chain] = true;
    library.bus.message('chainReady', req.chain, true);
    cb(null, {});
};
shared.getLastWithdrawal = function (req, cb) {
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var withdrawals, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4, app.sdb.find('Withdrawal', { chain: req.chain }, 1, { seq: -1 })];
                    case 1:
                        withdrawals = _a.sent();
                        if (!withdrawals || !withdrawals.length) {
                            return [2, cb(null, null)];
                        }
                        return [2, cb(null, withdrawals[0])];
                    case 2:
                        e_3 = _a.sent();
                        library.logger.error('getLastWithdrawal error', e_3);
                        return [2, cb('Failed to get last withdrawal transaction')];
                    case 3: return [2];
                }
            });
        });
    })();
};
shared.getDeposits = function (req, cb) {
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var deposits, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4, app.sdb.loadMany('Deposit', { seq: { $gt: req.body.seq }, chain: req.chain }, 100)];
                    case 1:
                        deposits = _a.sent();
                        return [2, cb(null, deposits)];
                    case 2:
                        e_4 = _a.sent();
                        library.logger.error('getDeposits error', e_4);
                        return [2, cb('Failed to get deposit transactions')];
                    case 3: return [2];
                }
            });
        });
    })();
};
shared.submitOutTransfer = function (req, cb) {
    var trs = req.body;
    library.sequence.add(function (done) {
        if (modules.transactions.hasUnconfirmed(trs)) {
            return done('Already exists');
        }
        library.logger.info("Submit outtransfer transaction " + trs.id + " from chain " + req.chain);
        return modules.transactions.processUnconfirmedTransaction(trs, done);
    }, cb);
};
shared.registerInterface = function (options, cb) {
    var chain = options.chain;
    var method = options.body.method;
    var uriPath = options.body.path;
    var handler = function (req, res) {
        var reqParams = {
            query: (method === 'get') ? req.query : req.body,
            params: req.params,
        };
        self.request(chain, method, uriPath, reqParams, function (e, b) {
            var body = b || {};
            var err = e;
            if (!err && body.error) {
                err = body.error;
            }
            if (err) {
                return res.json({ error: err.toString() });
            }
            body.success = true;
            return res.json(body);
        });
    };
    priv.routes[chain][method](uriPath, handler);
    priv.get(chain, function (err, chainObj) {
        if (err)
            return cb(err);
        priv.routes[chainObj.tid][method](uriPath, handler);
        console.log('------registerInterface', chainObj, method, uriPath);
        cb(null);
    });
};
module.exports = Chains;
