"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (b.hasOwnProperty(p))
                    d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var fs = require('fs');
var path = require('path');
var os = require('os');
var domain = require('domain');
var EventEmitter = require('events').EventEmitter;
var http = require('http');
var https = require('https');
var socketio = require('socket.io');
var async = require('async');
var ZSchema = require('z-schema');
var ip = require('ip');
var express = require('express');
var compression = require('compression');
var cors = require('cors');
var _ = require('lodash');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var Sequence = require('./utils/sequence.js');
var slots = require('./utils/slots.js');
var queryParser = require('./utils/express-query-int');
var ZSchemaExpress = require('./utils/zscheme-express.js');
var Transaction = require('./base/transaction.js');
var Block = require('./base/block.js');
var Consensus = require('./base/consensus.js');
var protobuf = require('./utils/protobuf.js');
var moduleNames = [
    'server',
    'accounts',
    'transactions',
    'loader',
    'system',
    'peer',
    'transport',
    'delegates',
    'round',
    'uia',
    'blocks',
];
var CIPHERS = "\n  ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:\n  ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:\n  ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:\n  DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:\n  !aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA";
function getPublicIp() {
    var publicIp = null;
    try {
        var ifaces_1 = os.networkInterfaces();
        Object.keys(ifaces_1).forEach(function (ifname) {
            ifaces_1[ifname].forEach(function (iface) {
                if (iface.family !== 'IPv4' || iface.internal !== false) {
                    return;
                }
                if (!ip.isPrivate(iface.address)) {
                    publicIp = iface.address;
                }
            });
        });
    }
    catch (e) {
        throw e;
    }
    return publicIp;
}
function isNumberOrNumberString(value) {
    return !(Number.isNaN(value) || Number.isNaN(parseInt(value, 10))
        || String(parseInt(value, 10)) !== String(value));
}
module.exports = function init(options, done) {
    var modules = [];
    var appConfig = options.appConfig, genesisblock = options.genesisblock;
    if (!appConfig.publicIp) {
        appConfig.publicIp = getPublicIp();
    }
    async.auto({
        config: function (cb) {
            cb(null, appConfig);
        },
        logger: function (cb) {
            cb(null, options.logger);
        },
        genesisblock: function (cb) {
            cb(null, { block: genesisblock });
        },
        protobuf: function (cb) {
            var protoFile = path.join(__dirname, '..', 'proto', 'index.proto');
            if (!fs.existsSync(protoFile)) {
                console.log('Failed: proto file not exists!');
                return;
            }
            protobuf(protoFile, cb);
        },
        scheme: function (cb) {
            ZSchema.registerFormat('hex', function (str) {
                var b;
                try {
                    b = Buffer.from(str, 'hex');
                }
                catch (e) {
                    return false;
                }
                return b && b.length > 0;
            });
            ZSchema.registerFormat('publicKey', function (str) {
                if (str.length === 0) {
                    return true;
                }
                try {
                    var publicKey = Buffer.from(str, 'hex');
                    return publicKey.length === 32;
                }
                catch (e) {
                    return false;
                }
            });
            ZSchema.registerFormat('splitarray', function (str) {
                try {
                    var a = str.split(',');
                    return a.length > 0 && a.length <= 1000;
                }
                catch (e) {
                    return false;
                }
            });
            ZSchema.registerFormat('signature', function (str) {
                if (str.length === 0) {
                    return true;
                }
                try {
                    var signature = Buffer.from(str, 'hex');
                    return signature.length === 64;
                }
                catch (e) {
                    return false;
                }
            });
            ZSchema.registerFormat('checkInt', function (value) { return !isNumberOrNumberString(value); });
            cb(null, new ZSchema());
        },
        network: ['config', function (cb, scope) {
                var app = express();
                app.use(compression({ level: 6 }));
                app.use(cors());
                app.options('*', cors());
                var server = http.createServer(app);
                var io = socketio(server);
                var sslio;
                var sslserver;
                if (scope.config.ssl.enabled) {
                    var privateKey = fs.readFileSync(scope.config.ssl.options.key);
                    var certificate = fs.readFileSync(scope.config.ssl.options.cert);
                    sslserver = https.createServer({
                        key: privateKey,
                        cert: certificate,
                        ciphers: CIPHERS,
                    }, app);
                    sslio = socketio(sslServer);
                }
                cb(null, {
                    express: express,
                    app: app,
                    server: server,
                    io: io,
                    sslserver: sslserver,
                    sslio: sslio,
                });
            }],
        dbSequence: ['logger', function (cb, scope) {
                var sequence = new Sequence({
                    name: 'db',
                    onWarning: function (current) {
                        scope.logger.warn('DB queue', current);
                    },
                });
                cb(null, sequence);
            }],
        sequence: ['logger', function (cb, scope) {
                var sequence = new Sequence({
                    name: 'normal',
                    onWarning: function (current) {
                        scope.logger.warn('Main queue', current);
                    },
                });
                cb(null, sequence);
            }],
        balancesSequence: ['logger', function (cb, scope) {
                var sequence = new Sequence({
                    name: 'balance',
                    onWarning: function (current) {
                        scope.logger.warn('Balance queue', current);
                    },
                });
                cb(null, sequence);
            }],
        connect: ['config', 'genesisblock', 'logger', 'network', function (cb, scope) {
                var PAYLOAD_LIMIT_SIZE = '8mb';
                scope.network.app.engine('html', require('ejs').renderFile);
                scope.network.app.set('view engine', 'ejs');
                scope.network.app.set('views', scope.config.publicDir);
                scope.network.app.use(scope.network.express.static(scope.config.publicDir));
                scope.network.app.use(bodyParser.raw({ limit: PAYLOAD_LIMIT_SIZE }));
                scope.network.app.use(bodyParser.urlencoded({
                    extended: true,
                    limit: PAYLOAD_LIMIT_SIZE,
                    parameterLimit: 5000,
                }));
                scope.network.app.use(bodyParser.json({ limit: PAYLOAD_LIMIT_SIZE }));
                scope.network.app.use(methodOverride());
                var ignore = [
                    'id', 'name', 'lastBlockId', 'blockId',
                    'transactionId', 'address', 'recipientId',
                    'senderId', 'previousBlock',
                ];
                scope.network.app.use(queryParser({
                    parser: function (value, radix, name) {
                        if (ignore.indexOf(name) >= 0) {
                            return value;
                        }
                        if (!isNumberOrNumberString(value)) {
                            return value;
                        }
                        return Number.parseInt(value, radix);
                    },
                }));
                scope.network.app.use(ZSchemaExpress(scope.scheme));
                scope.network.app.use(function (req, res, next) {
                    var parts = req.url.split('/');
                    var host = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    var port = req.headers.port;
                    scope.logger.debug("receive request: " + req.method + " " + req.url + " from " + host);
                    res.setHeader('X-Frame-Options', 'DENY');
                    res.setHeader('Content-Security-Policy', 'frame-ancestors \'none\'');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Length,  X-Requested-With, Content-Type, Accept, request-node-status');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');
                    if (req.method === 'OPTIONS') {
                        res.sendStatus(200);
                        scope.logger.debug('Response pre-flight request');
                        return;
                    }
                    var URI_PREFIXS = ['api', 'api2', 'peer'];
                    var isApiOrPeer = parts.length > 1 && (URI_PREFIXS.indexOf(parts[1]) !== -1);
                    var whiteList = scope.config.api.access.whiteList;
                    var blackList = scope.config.peers.blackList;
                    var forbidden = isApiOrPeer && ((whiteList.length > 0 && whiteList.indexOf(ip) < 0)
                        || (blackList.length > 0 && blackList.indexOf(ip) >= 0));
                    if (isApiOrPeer && forbidden) {
                        res.sendStatus(403);
                    }
                    else if (isApiOrPeer && req.headers['request-node-status'] === 'yes') {
                        var lastBlock = scope.modules.blocks.getLastBlock();
                        res.setHeader('Access-Control-Expose-Headers', 'node-status');
                        res.setHeader('node-status', JSON.stringify({
                            blockHeight: lastBlock.height,
                            blockTime: slots.getRealTime(lastBlock.timestamp),
                            blocksBehind: slots.getNextSlot() - (slots.getSlotNumber(lastBlock.timestamp) + 1),
                            version: scope.modules.peer.getVersion(),
                        }));
                        next();
                    }
                    else {
                        next();
                    }
                });
                scope.network.server.listen(scope.config.port, scope.config.address, function (err) {
                    scope.logger.log("Asch started: " + scope.config.address + ":" + scope.config.port);
                    if (!err) {
                        if (scope.config.ssl.enabled) {
                            scope.network.sslserver.listen(scope.config.ssl.options.port, scope.config.ssl.options.address, function (sslError) {
                                var _a = scope.config.ssl.options, address = _a.address, port = _a.port;
                                scope.logger.log("Asch https started: " + address + ":" + port);
                                cb(sslError, scope.network);
                            });
                        }
                        else {
                            cb(null, scope.network);
                        }
                    }
                    else {
                        cb(err, scope.network);
                    }
                });
            }],
        bus: function (cb) {
            var Bus = (function (_super) {
                __extends(Bus, _super);
                function Bus() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                Bus.prototype.message = function (topic) {
                    var restArgs = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        restArgs[_i - 1] = arguments[_i];
                    }
                    modules.forEach(function (module) {
                        var eventName = "on" + _.chain(topic).camelCase().upperFirst().value();
                        if (typeof (module[eventName]) === 'function') {
                            module[eventName].apply(module[eventName], restArgs.slice());
                        }
                    });
                    this.emit.apply(this, [topic].concat(restArgs));
                };
                return Bus;
            }(EventEmitter));
            cb(null, new Bus());
        },
        base: ['bus', 'scheme', 'genesisblock',
            function (outerCallback, outerScope) {
                async.auto({
                    bus: function (cb) {
                        cb(null, outerScope.bus);
                    },
                    scheme: function (cb) {
                        cb(null, outerScope.scheme);
                    },
                    genesisblock: function (cb) {
                        cb(null, { block: genesisblock });
                    },
                    consensus: ['bus', 'scheme', 'genesisblock', function (cb, scope) {
                            cb(null, new Consensus(scope));
                        }],
                    transaction: ['bus', 'scheme', 'genesisblock', function (cb, scope) {
                            cb(null, new Transaction(scope));
                        }],
                    block: ['bus', 'scheme', 'genesisblock', 'transaction', function (cb, scope) {
                            cb(null, new Block(scope));
                        }],
                }, outerCallback);
            }],
        modules: [
            'network', 'connect', 'config', 'logger', 'bus',
            'sequence', 'dbSequence', 'balancesSequence', 'base',
            function (outerCallback, scope) {
                global.library = scope;
                var tasks = {};
                moduleNames.forEach(function (name) {
                    tasks[name] = function (cb) {
                        var d = domain.create();
                        d.on('error', function (err) {
                            scope.logger.fatal("Domain " + name, { message: err.message, stack: err.stack });
                        });
                        d.run(function () {
                            scope.logger.debug('Loading module', name);
                            var Klass = require("./core/" + name);
                            var obj = new Klass(cb, scope);
                            modules.push(obj);
                        });
                    };
                });
                async.series(tasks, function (err, results) {
                    outerCallback(err, results);
                });
            }
        ],
    }, done);
};
