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
const crypto = require("crypto");
const Mnemonic = require("bitcore-mnemonic");
const ed = require("../utils/ed.js");
const Router = require("../utils/router");
const addressHelper = require("../utils/address");
class Account {
    constructor(scope) {
        this.shared = {};
        this.library = scope;
        this.attachApi();
    }
    openAccount(passphrase) {
        const hash = crypto.createHash('sha256').update(passphrase, 'utf8').digest();
        const keyPair = ed.MakeKeypair(hash);
        const publicKey = keyPair.publicKey.toString('hex');
        const address = this.generateAddressByPublicKey(publicKey);
        this.shared.getAccount({
            body: {
                address
            }
        }, (err, ret) => {
            if (ret && ret.account && !ret.account.publicKey) {
                ret.account.publicKey = publicKey;
            }
            return ret;
        });
    }
    openAccount2(publicKey) {
        const address = this.generateAddressByPublicKey(publicKey);
        this.shared.getAccount({
            body: {
                address
            }
        }, (err, ret) => {
            if (ret && ret.account && !ret.account.publicKey) {
                ret.account.publicKey = publicKey;
            }
            return ret;
        });
    }
    generateAddressByPublicKey(publicKey) {
        return addressHelper.generateNormalAddress(publicKey);
    }
    onBind(scope) {
        this.modules = scope;
    }
    newAccount(req) {
        let ent = Number(req.body.ent);
        if ([128, 256, 384].indexOf(ent) === -1) {
            ent = 128;
        }
        const secret = new Mnemonic(ent).toString();
        const keypair = ed.MakeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
        const address = this.generateAddressByPublicKey(keypair.publicKey);
        return {
            secret,
            publicKey: keypair.publicKey.toString('hex'),
            privateKey: keypair.privateKey.toString('hex'),
            address,
        };
    }
    open(req) {
        const { body } = req;
        this.library.scheme.validate(body, {
            type: 'object',
            properties: {
                secret: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                },
            },
            required: ['secret'],
        }, (err) => {
            if (err) {
                return err[0].message;
            }
            return this.openAccount(body.secret);
        });
    }
    open2(req) {
        const { body } = req;
        this.library.scheme.validate(body, {
            type: 'object',
            properties: {
                publicKey: {
                    type: 'string',
                    format: 'publicKey',
                },
            },
            required: ['publicKey'],
        }, (err) => {
            if (err) {
                return err[0].message;
            }
            return this.openAccount2(body.publicKey);
        });
    }
    getBalance(req) {
        const query = req.body;
        this.library.scheme.validate(query, {
            type: 'object',
            properties: {
                address: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 50,
                },
            },
            required: ['address'],
        }, (err) => {
            if (err) {
                return err[0].message;
            }
            if (!addressHelper.isAddress(query.address)) {
                return 'Invalid address';
            }
            return this.getAccount({ body: { address: query.address } }, (err2, ret) => {
                if (err2) {
                    return err2.toString();
                }
                const balance = ret && ret.account ? ret.account.balance : 0;
                const unconfirmedBalance = ret && ret.account ? ret.account.unconfirmedBalance : 0;
                return { balance, unconfirmedBalance };
            });
        });
    }
    getPublickey(req) {
        const query = req.body;
        this.library.scheme.validate(query, {
            type: 'object',
            properties: {
                address: {
                    type: 'string',
                    minLength: 1,
                },
            },
            required: ['address'],
        }, (err) => {
            if (err) {
                return err[0].message;
            }
            return this.getAccount({ address: query.address }, (err2, account) => {
                if (err2) {
                    return err2.toString();
                }
                if (!account || !account.publicKey) {
                    return 'Account does not have a public key';
                }
                return { publicKey: account.publicKey };
            });
        });
    }
    generatePublickey(req) {
        const { body } = req;
        this.library.scheme.validate(body, {
            type: 'object',
            properties: {
                secret: {
                    type: 'string',
                    minLength: 1,
                },
            },
            required: ['secret'],
        }, (err) => {
            if (err) {
                return err[0].message;
            }
            const kp = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
            const publicKey = kp.publicKey.toString('hex');
            return { publicKey };
        });
    }
    myVotedDelegates(req) {
        const query = req.body;
        this.library.scheme.validate(query, {
            type: 'object',
            properties: {
                address: {
                    type: 'string',
                    minLength: 1,
                },
                name: {
                    type: 'string',
                    minLength: 1,
                },
            },
        }, (err) => {
            if (err) {
                return err[0].message;
            }
            return (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    let addr;
                    if (query.name) {
                        const account = yield app.sdb.load('Account', { name: query.name });
                        if (!account) {
                            return 'Account not found';
                        }
                        addr = account.address;
                    }
                    else {
                        addr = query.address;
                    }
                    const votes = yield app.sdb.findAll('Vote', { condition: { address: addr } });
                    if (!votes || !votes.length) {
                        return { delegates: [] };
                    }
                    const delegateNames = new Set();
                    for (const v of votes) {
                        delegateNames.add(v.delegate);
                    }
                    const delegates = yield PIFY(modules.delegates.getDelegates)({});
                    if (!delegates || !delegates.length) {
                        return { delegates: [] };
                    }
                    const myVotedDelegates = delegates.filter(d => delegateNames.has(d.name));
                    return { delegates: myVotedDelegates };
                }
                catch (e) {
                    this.library.logger.error('get voted delegates error', e);
                    return 'Server error';
                }
            }))();
        });
    }
    getAccount(req) {
        const query = req.body;
        this.library.scheme.validate(query, {
            type: 'object',
            properties: {
                address: {
                    type: 'string',
                    minLength: 1,
                    mexLength: 50,
                },
            },
            required: ['address'],
        }, (err) => {
            if (err) {
                return err[0].message;
            }
            return (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const account = yield app.sdb.findOne('Account', { condition: { address: query.address } });
                    let accountData;
                    if (!account) {
                        accountData = {
                            address: query.address,
                            unconfirmedBalance: 0,
                            balance: 0,
                            secondPublicKey: '',
                            lockHeight: 0,
                        };
                    }
                    else {
                        const unconfirmedAccount = yield app.sdb.load('Account', { address: account.address });
                        accountData = {
                            address: account.address,
                            unconfirmedBalance: unconfirmedAccount.aec,
                            balance: account.aec,
                            secondPublicKey: account.secondPublicKey,
                            lockHeight: account.lockHeight || 0,
                        };
                    }
                    const latestBlock = this.modules.blocks.getLastBlock();
                    const ret = {
                        account: accountData,
                        latestBlock: {
                            height: latestBlock.height,
                            timestamp: latestBlock.timestamp,
                        },
                        version: this.modules.peer.getVersion(),
                    };
                    return ret;
                }
                catch (e) {
                    this.library.logger.error('Failed to get account', e);
                    return 'Server Error';
                }
            }))();
        });
    }
    attachApi() {
        const router = new Router();
        router.use((req, res, next) => {
            if (modules)
                return next();
            return res.status(500).send({
                success: false,
                error: 'Blockchain is syncing'
            });
        });
        router.map(this.shared, {
            'post /open': 'open',
            'post /open2': 'open2',
            'get /getBalance': 'getBalance',
            'get /getPublicKey': 'getPublicKey',
            'post /generatePublicKey': 'generatePublicKey',
            'get /delegates': 'myVotedDelegates',
            'get /': 'getAccount',
            'get /new': 'newAccount',
        });
        router.get('/count', (req, res) => (() => __awaiter(this, void 0, void 0, function* () {
            try {
                const count = yield app.sdb.count('Account');
                return res.json({ success: true, count });
            }
            catch (e) {
                return res.status(500).send({ success: false, error: 'Server error' });
            }
        }))());
        router.use((req, res) => {
            res.status(500).send({
                success: false,
                error: 'API endpoint not found',
            });
        });
        this.library.network.app.use('/api/accounts', router);
        this.library.network.app.use((err, req, res, next) => {
            if (!err)
                return next();
            this.library.logger.error(req.url, err);
            return res.status(500).send({
                success: false,
                error: err.toString(),
            });
        });
    }
}
exports.default = Account;
