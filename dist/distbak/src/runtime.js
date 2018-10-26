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
var fs = require('fs');
var path = require('path');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var changeCase = require('change-case');
var validate = require('validate.js');
var AschCore = require('asch-smartdb').AschCore;
var slots = require('./utils/slots');
var amountHelper = require('./utils/amount');
var Router = require('./utils/router.js');
var BalanceManager = require('./smartdb/balance-manager');
var AutoIncrement = require('./smartdb/auto-increment');
var AccountRole = require('./utils/account-role');
var transactionMode = require('./utils/transaction-mode.js');
var PIFY = util.promisify;
var RouteWrapper = (function () {
    function RouteWrapper() {
        this.hands = [];
        this.routePath = null;
    }
    RouteWrapper.prototype.get = function (routePath, handler) {
        this.handlers.push({ path: routePath, method: 'get', handler: handler });
    };
    RouteWrapper.prototype.put = function (routePath, handler) {
        this.handlers.push({ path: routePath, method: 'put', handler: handler });
    };
    RouteWrapper.prototype.post = function (routePath, handler) {
        this.handlers.push({ path: routePath, method: 'post', handler: handler });
    };
    Object.defineProperty(RouteWrapper.prototype, "path", {
        get: function () {
            return this.routePath;
        },
        set: function (val) {
            this.routePath = val;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RouteWrapper.prototype, "handlers", {
        get: function () {
            return this.hands;
        },
        enumerable: true,
        configurable: true
    });
    return RouteWrapper;
}());
function loadModels(dir) {
    return __awaiter(this, void 0, void 0, function () {
        var modelFiles, e_1, schemas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    modelFiles = [];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, PIFY(fs.readdir)(dir)];
                case 2:
                    modelFiles = _a.sent();
                    return [3, 4];
                case 3:
                    e_1 = _a.sent();
                    app.logger.error("models load error: " + e_1);
                    return [2];
                case 4:
                    app.logger.debug('models', modelFiles);
                    schemas = [];
                    modelFiles.forEach(function (modelFile) {
                        app.logger.info('loading model', modelFile);
                        var basename = path.basename(modelFile, '.js');
                        var modelName = _.chain(basename).camelCase().upperFirst().value();
                        var fullpath = path.resolve(dir, modelFile);
                        var schema = require(fullpath);
                        schemas.push(new AschCore.ModelSchema(schema, modelName));
                    });
                    return [4, app.sdb.init(schemas)];
                case 5:
                    _a.sent();
                    return [2];
            }
        });
    });
}
function loadContracts(dir) {
    return __awaiter(this, void 0, void 0, function () {
        var contractFiles, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4, PIFY(fs.readdir)(dir)];
                case 1:
                    contractFiles = _a.sent();
                    return [3, 3];
                case 2:
                    e_2 = _a.sent();
                    app.logger.error("contracts load error: " + e_2);
                    return [2];
                case 3:
                    contractFiles.forEach(function (contractFile) {
                        app.logger.info('loading contract', contractFile);
                        var basename = path.basename(contractFile, '.js');
                        var contractName = changeCase.snakeCase(basename);
                        var fullpath = path.resolve(dir, contractFile);
                        var contract = require(fullpath);
                        if (contractFile !== 'index.js') {
                            app.contract[contractName] = contract;
                        }
                    });
                    return [2];
            }
        });
    });
}
function loadInterfaces(dir, routes) {
    return __awaiter(this, void 0, void 0, function () {
        var interfaceFiles, e_3, _i, interfaceFiles_1, f, basename, rw, router, _loop_1, _a, _b, h;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4, PIFY(fs.readdir)(dir)];
                case 1:
                    interfaceFiles = _c.sent();
                    return [3, 3];
                case 2:
                    e_3 = _c.sent();
                    app.logger.error("interfaces load error: " + e_3);
                    return [2];
                case 3:
                    for (_i = 0, interfaceFiles_1 = interfaceFiles; _i < interfaceFiles_1.length; _i++) {
                        f = interfaceFiles_1[_i];
                        app.logger.info('loading interface', f);
                        basename = path.basename(f, '.js');
                        rw = new RouteWrapper();
                        require(path.resolve(dir, f))(rw);
                        router = new Router();
                        _loop_1 = function (h) {
                            router[h.method](h.path, function (req, res) {
                                (function () {
                                    return __awaiter(_this, void 0, void 0, function () {
                                        var result, response, e_4;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 2, , 3]);
                                                    return [4, h.handler(req)];
                                                case 1:
                                                    result = _a.sent();
                                                    response = { success: true };
                                                    if (util.isObject(result) && !Array.isArray(result)) {
                                                        response = _.assign(response, result);
                                                    }
                                                    else if (!util.isNullOrUndefined(result)) {
                                                        response.data = result;
                                                    }
                                                    res.send(response);
                                                    return [3, 3];
                                                case 2:
                                                    e_4 = _a.sent();
                                                    res.status(500).send({ success: false, error: e_4.message });
                                                    return [3, 3];
                                                case 3: return [2];
                                            }
                                        });
                                    });
                                })();
                            });
                        };
                        for (_a = 0, _b = rw.handlers; _a < _b.length; _a++) {
                            h = _b[_a];
                            _loop_1(h);
                        }
                        if (!rw.path) {
                            rw.path = "/api/v2/" + basename;
                        }
                        routes.use(rw.path, router);
                    }
                    return [2];
            }
        });
    });
}
function adaptSmartDBLogger(config) {
    var LogLevel = AschCore.LogLevel;
    var levelMap = {
        trace: LogLevel.Trace,
        debug: LogLevel.Debug,
        log: LogLevel.Log,
        info: LogLevel.Info,
        warn: LogLevel.Warn,
        error: LogLevel.Error,
        fatal: LogLevel.Fatal,
    };
    AschCore.LogManager.logFactory = {
        createLog: function () { return app.logger; },
        format: false,
        getLevel: function () {
            var appLogLevel = String(config.logLevel).toLocaleLowerCase();
            return levelMap[appLogLevel] || LogLevel.Info;
        },
    };
}
module.exports = function runtime(options) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, appDir, dataDir, BLOCK_HEADER_DIR, BLOCK_DB_PATH;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    global.app = {
                        sdb: null,
                        balances: null,
                        model: {},
                        contract: {},
                        contractTypeMapping: {},
                        feeMapping: {},
                        defaultFee: {
                            currency: 'AEC',
                            min: '10000000',
                        },
                        hooks: {},
                        custom: {},
                        logger: options.logger,
                    };
                    app.validators = {
                        amount: function (value) { return amountHelper.validate(value); },
                        name: function (value) {
                            var regname = /^[a-z0-9_]{2,20}$/;
                            if (!regname.test(value))
                                return 'Invalid name';
                            return null;
                        },
                        publickey: function (value) {
                            var reghex = /^[0-9a-fA-F]{64}$/;
                            if (!reghex.test(value))
                                return 'Invalid public key';
                            return null;
                        },
                        string: function (value, constraints) {
                            if (constraints.length) {
                                return JSON.stringify(validate({ data: value }, { data: { length: constraints.length } }));
                            }
                            if (constraints.isEmail) {
                                return JSON.stringify(validate({ email: value }, { email: { email: true } }));
                            }
                            if (constraints.url) {
                                return JSON.stringify(validate({ url: value }, { url: { url: constraints.url } }));
                            }
                            if (constraints.number) {
                                return JSON.stringify(validate({ number: value }, { number: { numericality: constraints.number } }));
                            }
                            return null;
                        },
                    };
                    app.validate = function (type, value, constraints) {
                        if (!app.validators[type])
                            throw new Error("Validator not found: " + type);
                        var error = app.validators[type](value, constraints);
                        if (error)
                            throw new Error(error);
                    };
                    app.registerContract = function (type, name) {
                        app.contractTypeMapping[type] = name;
                    };
                    app.getContractName = function (type) { return app.contractTypeMapping[type]; };
                    app.registerFee = function (type, min, currency) {
                        app.feeMapping[type] = {
                            currency: currency || app.defaultFee.currency,
                            min: min,
                        };
                    };
                    app.getFee = function (type) { return app.feeMapping[type]; };
                    app.setDefaultFee = function (min, currency) {
                        app.defaultFee.currency = currency;
                        app.defaultFee.min = min;
                    };
                    app.addRoundFee = function (fee, roundNumber) {
                        modules.blocks.increaseRoundData({ fees: fee }, roundNumber);
                    };
                    app.getRealTime = function (epochTime) { return slots.getRealTime(epochTime); };
                    app.registerHook = function (name, func) {
                        app.hooks[name] = func;
                    };
                    app.verifyBytes = function (bytes, pk, signature) { return app.api.crypto.verify(pk, signature, bytes); };
                    app.checkMultiSignature = function (bytes, allowedKeys, signatures, m) {
                        var keysigs = signatures.split(',');
                        var publicKeys = [];
                        var sigs = [];
                        for (var _i = 0, keysigs_1 = keysigs; _i < keysigs_1.length; _i++) {
                            var ks = keysigs_1[_i];
                            if (ks.length !== 192)
                                throw new Error('Invalid public key or signature');
                            publicKeys.push(ks.substr(0, 64));
                            sigs.push(ks.substr(64, 192));
                        }
                        var uniqPublicKeySet = new Set();
                        for (var _a = 0, publicKeys_1 = publicKeys; _a < publicKeys_1.length; _a++) {
                            var pk = publicKeys_1[_a];
                            uniqPublicKeySet.add(pk);
                        }
                        if (uniqPublicKeySet.size !== publicKeys.length)
                            throw new Error('Duplicated public key');
                        var sigCount = 0;
                        for (var i = 0; i < publicKeys.length; ++i) {
                            var pk = publicKeys[i];
                            var sig = sigs[i];
                            if (allowedKeys.indexOf(pk) !== -1 && app.verifyBytes(bytes, pk, sig)) {
                                sigCount++;
                            }
                        }
                        if (sigCount < m)
                            throw new Error('Signatures not enough');
                    };
                    app.isCurrentBookkeeper = function (addr) { return modules.delegates.getBookkeeperAddresses().has(addr); };
                    app.executeContract = function (context) {
                        return __awaiter(_this, void 0, void 0, function () {
                            var error, trs;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        context.activating = 1;
                                        return [4, library.base.transaction.apply(context)];
                                    case 1:
                                        error = _a.sent();
                                        if (!!error)
                                            return [3, 3];
                                        return [4, app.sdb.get('Transaction', { id: context.trs.id })];
                                    case 2:
                                        trs = _a.sent();
                                        if (!transactionMode.isRequestMode(context.trs.mode))
                                            throw new Error('Transaction mode is not request mode');
                                        app.sdb.update('TransactionStatu', { executed: 1 }, { tid: context.trs.id });
                                        app.addRoundFee(trs.fee, modules.round.calc(context.block.height));
                                        _a.label = 3;
                                    case 3: return [2, error];
                                }
                            });
                        });
                    };
                    app.AccountRole = AccountRole;
                    _a = options.appConfig, appDir = _a.appDir, dataDir = _a.dataDir;
                    BLOCK_HEADER_DIR = path.resolve(dataDir, 'blocks');
                    BLOCK_DB_PATH = path.resolve(dataDir, 'blockchain.db');
                    adaptSmartDBLogger(options.appConfig);
                    app.sdb = new AschCore.SmartDB(BLOCK_DB_PATH, BLOCK_HEADER_DIR);
                    app.balances = new BalanceManager(app.sdb);
                    app.autoID = new AutoIncrement(app.sdb);
                    app.events = new EventEmitter();
                    app.util = {
                        address: require('./utils/address.js'),
                        bignumber: require('./utils/bignumber'),
                        transactionMode: require('./utils/transaction-mode.js'),
                    };
                    return [4, loadModels(path.join(appDir, 'model'))];
                case 1:
                    _b.sent();
                    return [4, loadContracts(path.join(appDir, 'contract'))];
                case 2:
                    _b.sent();
                    return [4, loadInterfaces(path.join(appDir, 'interface'), options.library.network.app)];
                case 3:
                    _b.sent();
                    app.contractTypeMapping[1] = 'basic.transfer';
                    app.contractTypeMapping[2] = 'basic.setName';
                    app.contractTypeMapping[3] = 'basic.setPassword';
                    app.contractTypeMapping[4] = 'basic.lock';
                    app.contractTypeMapping[5] = 'basic.unlock';
                    app.contractTypeMapping[10] = 'basic.registerDelegate';
                    app.contractTypeMapping[11] = 'basic.vote';
                    app.contractTypeMapping[12] = 'basic.unvote';
                    app.contractTypeMapping[100] = 'uia.registerIssuer';
                    app.contractTypeMapping[101] = 'uia.registerAsset';
                    app.contractTypeMapping[102] = 'uia.issue';
                    app.contractTypeMapping[103] = 'uia.transfer';
                    return [2];
            }
        });
    });
};
