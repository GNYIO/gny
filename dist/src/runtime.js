"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
const events_1 = require("events");
const _ = require("lodash");
const changeCase = require("change-case");
const validate = require("validate.js");
const asch_smartdb_1 = require("asch-smartdb");
const slots = require("./utils/slots");
const amountHelper = require("./utils/amount");
const Router = require("./utils/router");
const BalanceManager = require("./smartdb/balance-manager");
const AutoIncrement = require("./smartdb/auto-increment");
const AccountRole = require("./utils/account-role");
const transactionMode = require("./utils/transaction-mode");
const PIFY = util.promisify;
class RouteWrapper {
    constructor() {
        this.hands = [];
        this.routePath = null;
    }
    get(routePath, handler) {
        this.handlers.push({ path: routePath, method: 'get', handler });
    }
    put(routePath, handler) {
        this.handlers.push({ path: routePath, method: 'put', handler });
    }
    post(routePath, handler) {
        this.handlers.push({ path: routePath, method: 'post', handler });
    }
    set path(val) {
        this.routePath = val;
    }
    get path() {
        return this.routePath;
    }
    get handlers() {
        return this.hands;
    }
}
function loadModels(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        let modelFiles = [];
        try {
            modelFiles = yield PIFY(fs.readdir)(dir);
        }
        catch (e) {
            app.logger.error(`models load error: ${e}`);
            return;
        }
        app.logger.debug('models', modelFiles);
        const schemas = [];
        modelFiles.forEach((modelFile) => {
            app.logger.info('loading model', modelFile);
            const basename = path.basename(modelFile, '.js');
            const modelName = _.chain(basename).camelCase().upperFirst().value();
            const fullpath = path.resolve(dir, modelFile);
            const schema = require(fullpath);
            schemas.push(new asch_smartdb_1.AschCore.ModelSchema(schema, modelName));
        });
        yield app.sdb.init(schemas);
    });
}
function loadContracts(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        let contractFiles;
        try {
            contractFiles = yield PIFY(fs.readdir)(dir);
        }
        catch (e) {
            app.logger.error(`contracts load error: ${e}`);
            return;
        }
        contractFiles.forEach((contractFile) => {
            app.logger.info('loading contract', contractFile);
            const basename = path.basename(contractFile, '.js');
            const contractName = changeCase.snakeCase(basename);
            const fullpath = path.resolve(dir, contractFile);
            const contract = require(fullpath);
            if (contractFile !== 'index.js') {
                app.contract[contractName] = contract;
            }
        });
    });
}
function loadInterfaces(dir, routes) {
    return __awaiter(this, void 0, void 0, function* () {
        let interfaceFiles;
        try {
            interfaceFiles = yield PIFY(fs.readdir)(dir);
        }
        catch (e) {
            app.logger.error(`interfaces load error: ${e}`);
            return;
        }
        for (const f of interfaceFiles) {
            app.logger.info('loading interface', f);
            const basename = path.basename(f, '.js');
            const rw = new RouteWrapper();
            require(path.resolve(dir, f))(rw);
            const router = new Router();
            for (const h of rw.handlers) {
                router[h.method](h.path, (req, res) => {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const result = yield h.handler(req);
                            let response = { success: true };
                            if (util.isObject(result) && !Array.isArray(result)) {
                                response = _.assign(response, result);
                            }
                            else if (!util.isNullOrUndefined(result)) {
                                response.data = result;
                            }
                            res.send(response);
                        }
                        catch (e) {
                            res.status(500).send({ success: false, error: e.message });
                        }
                    }))();
                });
            }
            if (!rw.path) {
                rw.path = `/api/v2/${basename}`;
            }
            routes.use(rw.path, router);
        }
    });
}
function adaptSmartDBLogger(config) {
    const { LogLevel } = asch_smartdb_1.AschCore;
    const levelMap = {
        trace: LogLevel.Trace,
        debug: LogLevel.Debug,
        log: LogLevel.Log,
        info: LogLevel.Info,
        warn: LogLevel.Warn,
        error: LogLevel.Error,
        fatal: LogLevel.Fatal,
    };
    asch_smartdb_1.AschCore.LogManager.logFactory = {
        createLog: () => app.logger,
        format: false,
        getLevel: () => {
            const appLogLevel = String(config.logLevel).toLocaleLowerCase();
            return levelMap[appLogLevel] || LogLevel.Info;
        },
    };
}
module.exports = function runtime(options) {
    return __awaiter(this, void 0, void 0, function* () {
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
            amount: value => amountHelper.validate(value),
            name: (value) => {
                const regname = /^[a-z0-9_]{2,20}$/;
                if (!regname.test(value))
                    return 'Invalid name';
                return null;
            },
            publickey: (value) => {
                const reghex = /^[0-9a-fA-F]{64}$/;
                if (!reghex.test(value))
                    return 'Invalid public key';
                return null;
            },
            string: (value, constraints) => {
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
        app.validate = (type, value, constraints) => {
            if (!app.validators[type])
                throw new Error(`Validator not found: ${type}`);
            const error = app.validators[type](value, constraints);
            if (error)
                throw new Error(error);
        };
        app.registerContract = (type, name) => {
            app.contractTypeMapping[type] = name;
        };
        app.getContractName = type => app.contractTypeMapping[type];
        app.registerFee = (type, min, currency) => {
            app.feeMapping[type] = {
                currency: currency || app.defaultFee.currency,
                min,
            };
        };
        app.getFee = type => app.feeMapping[type];
        app.setDefaultFee = (min, currency) => {
            app.defaultFee.currency = currency;
            app.defaultFee.min = min;
        };
        app.addRoundFee = (fee, roundNumber) => {
            modules.blocks.increaseRoundData({ fees: fee }, roundNumber);
        };
        app.getRealTime = epochTime => slots.getRealTime(epochTime);
        app.registerHook = (name, func) => {
            app.hooks[name] = func;
        };
        app.verifyBytes = (bytes, pk, signature) => app.api.crypto.verify(pk, signature, bytes);
        app.checkMultiSignature = (bytes, allowedKeys, signatures, m) => {
            const keysigs = signatures.split(',');
            const publicKeys = [];
            const sigs = [];
            for (const ks of keysigs) {
                if (ks.length !== 192)
                    throw new Error('Invalid public key or signature');
                publicKeys.push(ks.substr(0, 64));
                sigs.push(ks.substr(64, 192));
            }
            const uniqPublicKeySet = new Set();
            for (const pk of publicKeys) {
                uniqPublicKeySet.add(pk);
            }
            if (uniqPublicKeySet.size !== publicKeys.length)
                throw new Error('Duplicated public key');
            let sigCount = 0;
            for (let i = 0; i < publicKeys.length; ++i) {
                const pk = publicKeys[i];
                const sig = sigs[i];
                if (allowedKeys.indexOf(pk) !== -1 && app.verifyBytes(bytes, pk, sig)) {
                    sigCount++;
                }
            }
            if (sigCount < m)
                throw new Error('Signatures not enough');
        };
        app.isCurrentBookkeeper = addr => modules.delegates.getBookkeeperAddresses().has(addr);
        app.executeContract = (context) => __awaiter(this, void 0, void 0, function* () {
            context.activating = 1;
            const error = yield library.base.transaction.apply(context);
            if (!error) {
                const trs = yield app.sdb.get('Transaction', { id: context.trs.id });
                if (!transactionMode.isRequestMode(context.trs.mode))
                    throw new Error('Transaction mode is not request mode');
                app.sdb.update('TransactionStatu', { executed: 1 }, { tid: context.trs.id });
                app.addRoundFee(trs.fee, modules.round.calc(context.block.height));
            }
            return error;
        });
        app.AccountRole = AccountRole;
        const { appDir, dataDir } = options.appConfig;
        const BLOCK_HEADER_DIR = path.resolve(dataDir, 'blocks');
        const BLOCK_DB_PATH = path.resolve(dataDir, 'blockchain.db');
        adaptSmartDBLogger(options.appConfig);
        app.sdb = new asch_smartdb_1.AschCore.SmartDB(BLOCK_DB_PATH, BLOCK_HEADER_DIR);
        app.balances = new BalanceManager(app.sdb);
        app.autoID = new AutoIncrement(app.sdb);
        app.events = new events_1.EventEmitter();
        app.util = {
            address: require('./utils/address.js'),
            bignumber: require('./utils/bignumber'),
            transactionMode: require('./utils/transaction-mode.js'),
        };
        yield loadModels(path.join(appDir, 'model'));
        yield loadContracts(path.join(appDir, 'contract'));
        yield loadInterfaces(path.join(appDir, 'interface'), options.library.network.app);
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
    });
};
