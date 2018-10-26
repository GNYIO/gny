"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const assert = require("assert");
const crypto = require("crypto");
const async = require("async");
const util = require("util");
const isArray = require("util");
isArray;
const constants = require("../utils/constants");
const BlockStatus = require("../utils/block-status");
const Router = require("../utils/router");
const slots = require("../utils/slots");
const sandboxHelper = require("../utils/sandbox");
const addressHelper = require("../utils/address");
const transactionMode = require("../utils/transaction-mode");
let genesisblock = null;
let modules;
let library;
let self;
const priv = {};
const shared = {};
const PIFY = util.promisify;
priv.lastBlock = {};
priv.blockStatus = new BlockStatus();
priv.loaded = false;
priv.isActive = false;
priv.blockCache = {};
priv.proposeCache = {};
priv.lastPropose = null;
priv.isCollectingVotes = false;
function Blocks(cb, scope) {
    library = scope;
    genesisblock = library.genesisblock;
    self = this;
    priv.attachApi();
    setImmediate(cb, null, self);
}
priv.attachApi = () => {
    const router = new Router();
    router.use((req, res, next) => {
        if (modules)
            return next();
        return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });
    router.map(shared, {
        'get /get': 'getBlock',
        'get /full': 'getFullBlock',
        'get /': 'getBlocks',
        'get /getHeight': 'getHeight',
        'get /getMilestone': 'getMilestone',
        'get /getReward': 'getReward',
        'get /getSupply': 'getSupply',
        'get /getStatus': 'getStatus',
    });
    router.use((req, res) => {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
    });
    library.network.app.use('/api/blocks', router);
    library.network.app.use((err, req, res, next) => {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
priv.getIdSequence2 = (height, cb) => {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const maxHeight = Math.max(height, priv.lastBlock.height);
            const minHeight = Math.max(0, maxHeight - 4);
            let blocks = yield app.sdb.getBlocksByHeightRange(minHeight, maxHeight);
            blocks = blocks.reverse();
            const ids = blocks.map(b => b.id);
            return cb(null, { ids, firstHeight: minHeight });
        }
        catch (e) {
            return cb(e);
        }
    }))();
};
Blocks.prototype.toAPIV1Blocks = (blocks) => {
    if (blocks && isArray(blocks) && blocks.length > 0) {
        return blocks.map(b => self.toAPIV1Block(b));
    }
    return [];
};
Blocks.prototype.toAPIV1Block = (block) => {
    if (!block)
        return undefined;
    return {
        id: block.id,
        version: block.version,
        timestamp: block.timestamp,
        height: Number(block.height),
        payloadHash: block.payloadHash,
        previousBlock: block.prevBlockId,
        numberOfTransactions: block.count,
        totalFee: block.fees,
        generatorPublicKey: block.delegate,
        blockSignature: block.signature,
        confirmations: self.getLastBlock().height - block.height,
        transactions: !block.transactions ? undefined : modules.transactions.toAPIV1Transactions(block.transactions.filter(t => t.executed), block),
    };
};
Blocks.prototype.getCommonBlock = (peer, height, cb) => {
    const lastBlockHeight = height;
    priv.getIdSequence2(lastBlockHeight, (err, data) => {
        if (err) {
            return cb(`Failed to get last block id sequence${err}`);
        }
        library.logger.trace('getIdSequence=========', data);
        const params = {
            max: lastBlockHeight,
            min: data.firstHeight,
            ids: data.ids,
        };
        return modules.peer.request('commonBlock', params, peer, (err2, ret) => {
            if (err2 || ret.error) {
                return cb(err2 || ret.error.toString());
            }
            if (!ret.common) {
                return cb('Common block not found');
            }
            return cb(null, ret.common);
        });
    });
};
Blocks.prototype.getBlock = (filter, cb) => {
    shared.getBlock({ body: filter }, cb);
};
Blocks.prototype.setLastBlock = (block) => {
    priv.lastBlock = block;
    global.featureSwitch.enableLongId = true;
    global.featureSwitch.enable1_3_0 = true;
    global.featureSwitch.enableClubBonus = (!!global.state.clubInfo);
    global.featureSwitch.enableMoreLockTypes = true;
    global.featureSwitch.enableLockReset = true;
    global.featureSwitch.fixVoteNewAddressIssue = true;
    global.featureSwitch.enableUIA = global.featureSwitch.enableLongId;
};
Blocks.prototype.getLastBlock = () => priv.lastBlock;
Blocks.prototype.verifyBlock = (block, options) => __awaiter(this, void 0, void 0, function* () {
    try {
        block.id = library.base.block.getId(block);
    }
    catch (e) {
        throw new Error(`Failed to get block id: ${e.toString()}`);
    }
    library.logger.debug(`verifyBlock, id: ${block.id}, h: ${block.height}`);
    if (!block.prevBlockId && block.height !== 0) {
        throw new Error('Previous block should not be null');
    }
    try {
        if (!library.base.block.verifySignature(block)) {
            throw new Error('Failed to verify block signature');
        }
    }
    catch (e) {
        library.logger.error({ e, block });
        throw new Error(`Got exception while verify block signature: ${e.toString()}`);
    }
    if (block.prevBlockId !== priv.lastBlock.id) {
        throw new Error('Incorrect previous block hash');
    }
    if (block.height !== 0) {
        const blockSlotNumber = slots.getSlotNumber(block.timestamp);
        const lastBlockSlotNumber = slots.getSlotNumber(priv.lastBlock.timestamp);
        if (blockSlotNumber > slots.getSlotNumber() + 1 || blockSlotNumber <= lastBlockSlotNumber) {
            throw new Error(`Can't verify block timestamp: ${block.id}`);
        }
    }
    if (block.transactions.length > constants.maxTxsPerBlock) {
        throw new Error(`Invalid amount of block assets: ${block.id}`);
    }
    if (block.transactions.length !== block.count) {
        throw new Error('Invalid transaction count');
    }
    const payloadHash = crypto.createHash('sha256');
    const appliedTransactions = {};
    let totalFee = 0;
    for (const transaction of block.transactions) {
        totalFee += transaction.fee;
        let bytes;
        try {
            bytes = library.base.transaction.getBytes(transaction);
        }
        catch (e) {
            throw new Error(`Failed to get transaction bytes: ${e.toString()}`);
        }
        if (appliedTransactions[transaction.id]) {
            throw new Error(`Duplicate transaction id in block ${block.id}`);
        }
        appliedTransactions[transaction.id] = transaction;
        payloadHash.update(bytes);
    }
    if (totalFee !== block.fees) {
        throw new Error('Invalid total fees');
    }
    const expectedReward = priv.blockStatus.calcReward(block.height);
    if (expectedReward !== block.reward) {
        throw new Error('Invalid block reward');
    }
    if (payloadHash.digest().toString('hex') !== block.payloadHash) {
        throw new Error(`Invalid payload hash: ${block.id}`);
    }
    if (options.votes) {
        const votes = options.votes;
        if (block.height !== votes.height) {
            throw new Error('Votes height is not correct');
        }
        if (block.id !== votes.id) {
            throw new Error('Votes id is not correct');
        }
        if (!votes.signatures || !library.base.consensus.hasEnoughVotesRemote(votes)) {
            throw new Error('Votes signature is not correct');
        }
        yield self.verifyBlockVotes(block, votes);
    }
});
Blocks.prototype.verifyBlockVotes = (block, votes) => __awaiter(this, void 0, void 0, function* () {
    const delegateList = yield PIFY(modules.delegates.generateDelegateList)(block.height);
    const publicKeySet = new Set(delegateList);
    for (const item of votes.signatures) {
        if (!publicKeySet.has(item.key.toString('hex'))) {
            throw new Error(`Votes key is not in the top list: ${item.key}`);
        }
        if (!library.base.consensus.verifyVote(votes.height, votes.id, item)) {
            throw new Error('Failed to verify vote signature');
        }
    }
});
Blocks.prototype.applyBlock = (block) => __awaiter(this, void 0, void 0, function* () {
    app.logger.trace('enter applyblock');
    const appliedTransactions = {};
    try {
        for (const transaction of block.transactions) {
            if (appliedTransactions[transaction.id]) {
                throw new Error(`Duplicate transaction in block: ${transaction.id}`);
            }
            yield modules.transactions.applyUnconfirmedTransactionAsync(transaction);
            appliedTransactions[transaction.id] = transaction;
        }
    }
    catch (e) {
        app.logger.error(e);
        yield app.sdb.rollbackBlock();
        throw new Error(`Failed to apply block: ${e}`);
    }
});
Blocks.prototype.processBlock = (b, options) => __awaiter(this, void 0, void 0, function* () {
    if (!priv.loaded)
        throw new Error('Blockchain is loading');
    let block = b;
    app.sdb.beginBlock(block);
    if (!block.transactions)
        block.transactions = [];
    if (!options.local) {
        try {
            block = library.base.block.objectNormalize(block);
        }
        catch (e) {
            library.logger.error(`Failed to normalize block: ${e}`, block);
            throw e;
        }
        yield self.verifyBlock(block, options);
        library.logger.debug('verify block ok');
        if (block.height !== 0) {
            const exists = (undefined !== (yield app.sdb.getBlockById(block.id)));
            if (exists)
                throw new Error(`Block already exists: ${block.id}`);
        }
        if (block.height !== 0) {
            try {
                yield PIFY(modules.delegates.validateBlockSlot)(block);
            }
            catch (e) {
                library.logger.error(e);
                throw new Error(`Can't verify slot: ${e}`);
            }
            library.logger.debug('verify block slot ok');
        }
        for (const transaction of block.transactions) {
            library.base.transaction.objectNormalize(transaction);
        }
        const idList = block.transactions.map(t => t.id);
        if (yield app.sdb.exists('Transaction', { id: { $in: idList } })) {
            throw new Error('Block contain already confirmed transaction');
        }
        app.logger.trace('before applyBlock');
        try {
            yield self.applyBlock(block, options);
        }
        catch (e) {
            app.logger.error(`Failed to apply block: ${e}`);
            throw e;
        }
    }
    try {
        self.saveBlockTransactions(block);
        yield self.applyRound(block);
        yield app.sdb.commitBlock();
        const trsCount = block.transactions.length;
        app.logger.info(`Block applied correctly with ${trsCount} transactions`);
        self.setLastBlock(block);
        if (options.broadcast) {
            options.votes.signatures = options.votes.signatures.slice(0, 6);
            library.bus.message('newBlock', block, options.votes);
        }
        library.bus.message('processBlock', block);
    }
    catch (e) {
        app.logger.error(block);
        app.logger.error('save block error: ', e);
        yield app.sdb.rollbackBlock();
        throw new Error(`Failed to save block: ${e}`);
    }
    finally {
        priv.blockCache = {};
        priv.proposeCache = {};
        priv.lastVoteTime = null;
        priv.isCollectingVotes = false;
        library.base.consensus.clearState();
    }
});
Blocks.prototype.saveBlockTransactions = (block) => {
    app.logger.trace('Blocks#saveBlockTransactions height', block.height);
    for (const trs of block.transactions) {
        trs.height = block.height;
        app.sdb.create('Transaction', trs);
    }
    app.logger.trace('Blocks#save transactions');
};
Blocks.prototype.increaseRoundData = (modifier, roundNumber) => {
    app.sdb.createOrLoad('Round', { fees: 0, rewards: 0, round: roundNumber });
    return app.sdb.increase('Round', modifier, { round: roundNumber });
};
Blocks.prototype.applyRound = (block) => __awaiter(this, void 0, void 0, function* () {
    if (block.height === 0) {
        modules.delegates.updateBookkeeper();
        return;
    }
    let address = addressHelper.generateNormalAddress(block.delegate);
    app.sdb.increase('Delegate', { producedBlocks: 1 }, { address });
    let transFee = 0;
    for (const t of block.transactions) {
        if (transactionMode.isDirectMode(t.mode)) {
            transFee += t.fee;
        }
    }
    const roundNumber = modules.round.calc(block.height);
    const { fees, rewards } = self.increaseRoundData({ fees: transFee, rewards: block.reward }, roundNumber);
    if (block.height % 101 !== 0)
        return;
    app.logger.debug(`----------------------on round ${roundNumber} end-----------------------`);
    const delegates = yield PIFY(modules.delegates.generateDelegateList)(block.height);
    app.logger.debug('delegate length', delegates.length);
    const forgedBlocks = yield app.sdb.getBlocksByHeightRange(block.height - 100, block.height - 1);
    const forgedDelegates = [...forgedBlocks.map(b => b.delegate), block.delegate];
    const missedDelegates = delegates.filter(fd => !forgedDelegates.includes(fd));
    missedDelegates.forEach((md) => {
        address = addressHelper.generateNormalAddress(md);
        app.sdb.increase('Delegate', { missedDelegate: 1 }, { address });
    });
    function updateDelegate(pk, fee, reward) {
        return __awaiter(this, void 0, void 0, function* () {
            address = addressHelper.generateNormalAddress(pk);
            app.sdb.increase('Delegate', { fees: fee, rewards: reward }, { address });
            app.sdb.increase('Account', { aec: fee + reward }, { address });
        });
    }
    const councilControl = 0;
    if (councilControl) {
        const councilAddress = 'GADQ2bozmxjBfYHDQx3uwtpwXmdhafUdkN';
        app.sdb.createOrLoad('Account', { aec: 0, address: councilAddress, name: null });
        app.sdb.increase('Account', { aec: fees + rewards }, { address: councilAddress });
    }
    else {
        const ratio = 1;
        const actualFees = Math.floor(fees * ratio);
        const feeAverage = Math.floor(actualFees / delegates.length);
        const feeRemainder = actualFees - (feeAverage * delegates.length);
        const actualRewards = Math.floor(rewards * ratio);
        const rewardAverage = Math.floor(actualRewards / delegates.length);
        const rewardRemainder = actualRewards - (rewardAverage * delegates.length);
        for (const fd of forgedDelegates) {
            yield updateDelegate(fd, feeAverage, rewardAverage);
        }
        yield updateDelegate(block.delegate, feeRemainder, rewardRemainder);
    }
    if (block.height % 101 === 0) {
        modules.delegates.updateBookkeeper();
    }
});
Blocks.prototype.getBlocks = (minHeight, maxHeight, withTransaction) => __awaiter(this, void 0, void 0, function* () {
    const blocks = yield app.sdb.getBlocksByHeightRange(minHeight, maxHeight);
    if (!blocks || !blocks.length) {
        return [];
    }
    maxHeight = blocks[blocks.length - 1].height;
    if (withTransaction) {
        const transactions = yield app.sdb.findAll('Transaction', {
            condition: {
                height: { $gte: minHeight, $lte: maxHeight },
            },
        });
        const firstHeight = blocks[0].height;
        for (const t of transactions) {
            const h = t.height;
            const b = blocks[h - firstHeight];
            if (b) {
                if (!b.transactions) {
                    b.transactions = [];
                }
                b.transactions.push(t);
            }
        }
    }
    return blocks;
});
Blocks.prototype.loadBlocksFromPeer = (peer, id, cb) => {
    let loaded = false;
    let count = 0;
    let lastValidBlock = null;
    let lastCommonBlockId = id;
    async.whilst(() => !loaded && count < 30, (next) => {
        count++;
        const limit = 200;
        const params = {
            limit,
            lastBlockId: lastCommonBlockId,
        };
        modules.peer.request('blocks', params, peer, (err, body) => {
            if (err) {
                return next(`Failed to request remote peer: ${err}`);
            }
            if (!body) {
                return next('Invalid response for blocks request');
            }
            const blocks = body.blocks;
            if (!isArray(blocks) || blocks.length === 0) {
                loaded = true;
                return next();
            }
            const num = isArray(blocks) ? blocks.length : 0;
            const address = `${peer.host}:${peer.port - 1}`;
            library.logger.info(`Loading ${num} blocks from ${address}`);
            return (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    for (const block of blocks) {
                        yield self.processBlock(block, { syncing: true });
                        lastCommonBlockId = block.id;
                        lastValidBlock = block;
                        library.logger.info(`Block ${block.id} loaded from ${address} at`, block.height);
                    }
                    return next();
                }
                catch (e) {
                    library.logger.error('Failed to process synced block', e);
                    return cb(e);
                }
            }))();
        });
    }, (err) => {
        if (err) {
            library.logger.error('load blocks from remote peer error:', err);
        }
        setImmediate(cb, err, lastValidBlock);
    });
};
Blocks.prototype.generateBlock = (keypair, timestamp) => __awaiter(this, void 0, void 0, function* () {
    if (library.base.consensus.hasPendingBlock(timestamp)) {
        return null;
    }
    const unconfirmedList = modules.transactions.getUnconfirmedTransactionList();
    const payloadHash = crypto.createHash('sha256');
    let payloadLength = 0;
    let fees = 0;
    for (const transaction of unconfirmedList) {
        fees += transaction.fee;
        const bytes = library.base.transaction.getBytes(transaction);
        if ((payloadLength + bytes.length) > 8 * 1024 * 1024) {
            throw new Error('Playload length outof range');
        }
        payloadHash.update(bytes);
        payloadLength += bytes.length;
    }
    const height = priv.lastBlock.height + 1;
    const block = {
        version: 0,
        delegate: keypair.publicKey.toString('hex'),
        height,
        prevBlockId: priv.lastBlock.id,
        timestamp,
        transactions: unconfirmedList,
        count: unconfirmedList.length,
        fees,
        payloadHash: payloadHash.digest().toString('hex'),
        reward: priv.blockStatus.calcReward(height),
    };
    block.signature = library.base.block.sign(block, keypair);
    block.id = library.base.block.getId(block);
    let activeKeypairs;
    try {
        activeKeypairs = yield PIFY(modules.delegates.getActiveDelegateKeypairs)(block.height);
    }
    catch (e) {
        throw new Error(`Failed to get active delegate keypairs: ${e}`);
    }
    const id = block.id;
    assert(activeKeypairs && activeKeypairs.length > 0, 'Active keypairs should not be empty');
    library.logger.info(`get active delegate keypairs len: ${activeKeypairs.length}`);
    const localVotes = library.base.consensus.createVotes(activeKeypairs, block);
    if (library.base.consensus.hasEnoughVotes(localVotes)) {
        modules.transactions.clearUnconfirmed();
        yield self.processBlock(block, { local: true, broadcast: true, votes: localVotes });
        library.logger.info(`Forged new block id: ${id}, height: ${height}, round: ${modules.round.calc(height)}, slot: ${slots.getSlotNumber(block.timestamp)}, reward: ${block.reward}`);
        return null;
    }
    if (!library.config.publicIp) {
        library.logger.error('No public ip');
        return null;
    }
    const serverAddr = `${library.config.publicIp}:${library.config.peerPort}`;
    let propose;
    try {
        propose = library.base.consensus.createPropose(keypair, block, serverAddr);
    }
    catch (e) {
        library.logger.error('Failed to create propose', e);
        return null;
    }
    library.base.consensus.setPendingBlock(block);
    library.base.consensus.addPendingVotes(localVotes);
    priv.proposeCache[propose.hash] = true;
    priv.isCollectingVotes = true;
    library.bus.message('newPropose', propose, true);
    return null;
});
Blocks.prototype.sandboxApi = (call, args, cb) => {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Blocks.prototype.onReceiveBlock = (block, votes) => {
    if (modules.loader.syncing() || !priv.loaded) {
        return;
    }
    if (priv.blockCache[block.id]) {
        return;
    }
    priv.blockCache[block.id] = true;
    library.sequence.add((cb) => {
        if (block.prevBlockId === priv.lastBlock.id && priv.lastBlock.height + 1 === block.height) {
            library.logger.info(`Received new block id: ${block.id}` +
                ` height: ${block.height}` +
                ` round: ${modules.round.calc(modules.blocks.getLastBlock().height)}` +
                ` slot: ${slots.getSlotNumber(block.timestamp)}`);
            return (() => __awaiter(this, void 0, void 0, function* () {
                const pendingTrsMap = new Map();
                try {
                    const pendingTrs = modules.transactions.getUnconfirmedTransactionList();
                    for (const t of pendingTrs) {
                        pendingTrsMap.set(t.id, t);
                    }
                    modules.transactions.clearUnconfirmed();
                    yield app.sdb.rollbackBlock();
                    yield self.processBlock(block, { votes, broadcast: true });
                }
                catch (e) {
                    library.logger.error('Failed to process received block', e);
                }
                finally {
                    for (const t of block.transactions) {
                        pendingTrsMap.delete(t.id);
                    }
                    try {
                        const redoTransactions = [...pendingTrsMap.values()];
                        yield modules.transactions.processUnconfirmedTransactionsAsync(redoTransactions);
                    }
                    catch (e) {
                        library.logger.error('Failed to redo unconfirmed transactions', e);
                    }
                    cb();
                }
            }))();
        }
        if (block.prevBlockId !== priv.lastBlock.id
            && priv.lastBlock.height + 1 === block.height) {
            modules.delegates.fork(block, 1);
            return cb('Fork');
        }
        if (block.prevBlockId === priv.lastBlock.prevBlockId
            && block.height === priv.lastBlock.height
            && block.id !== priv.lastBlock.id) {
            modules.delegates.fork(block, 5);
            return cb('Fork');
        }
        if (block.height > priv.lastBlock.height + 1) {
            library.logger.info(`receive discontinuous block height ${block.height}`);
            modules.loader.startSyncBlocks();
            return cb();
        }
        return cb();
    });
};
Blocks.prototype.onReceivePropose = (propose) => {
    if (modules.loader.syncing() || !priv.loaded) {
        return;
    }
    if (priv.proposeCache[propose.hash]) {
        return;
    }
    priv.proposeCache[propose.hash] = true;
    library.sequence.add((cb) => {
        if (priv.lastPropose && priv.lastPropose.height === propose.height
            && priv.lastPropose.generatorPublicKey === propose.generatorPublicKey
            && priv.lastPropose.id !== propose.id) {
            library.logger.warn(`generate different block with the same height, generator: ${propose.generatorPublicKey}`);
            return setImmediate(cb);
        }
        if (propose.height !== priv.lastBlock.height + 1) {
            library.logger.debug('invalid propose height', propose);
            if (propose.height > priv.lastBlock.height + 1) {
                library.logger.info(`receive discontinuous propose height ${propose.height}`);
                modules.loader.startSyncBlocks();
            }
            return setImmediate(cb);
        }
        if (priv.lastVoteTime && Date.now() - priv.lastVoteTime < 5 * 1000) {
            library.logger.debug('ignore the frequently propose');
            return setImmediate(cb);
        }
        library.logger.info(`receive propose height ${propose.height} bid ${propose.id}`);
        return async.waterfall([
            (next) => {
                modules.delegates.validateProposeSlot(propose, (err) => {
                    if (err) {
                        next(`Failed to validate propose slot: ${err}`);
                    }
                    else {
                        next();
                    }
                });
            },
            (next) => {
                library.base.consensus.acceptPropose(propose, (err) => {
                    if (err) {
                        next(`Failed to accept propose: ${err}`);
                    }
                    else {
                        next();
                    }
                });
            },
            (next) => {
                modules.delegates.getActiveDelegateKeypairs(propose.height, (err, activeKeypairs) => {
                    if (err) {
                        next(`Failed to get active keypairs: ${err}`);
                    }
                    else {
                        next(null, activeKeypairs);
                    }
                });
            },
            (activeKeypairs, next) => {
                if (activeKeypairs && activeKeypairs.length > 0) {
                    const votes = library.base.consensus.createVotes(activeKeypairs, propose);
                    library.logger.debug(`send votes height ${votes.height} id ${votes.id} sigatures ${votes.signatures.length}`);
                    modules.transport.sendVotes(votes, propose.address);
                    priv.lastVoteTime = Date.now();
                    priv.lastPropose = propose;
                }
                setImmediate(next);
            },
        ], (err) => {
            if (err) {
                library.logger.error(`onReceivePropose error: ${err}`);
            }
            library.logger.debug('onReceivePropose finished');
            cb();
        });
    });
};
Blocks.prototype.onReceiveVotes = (votes) => {
    if (modules.loader.syncing() || !priv.loaded) {
        return;
    }
    library.sequence.add((cb) => {
        const totalVotes = library.base.consensus.addPendingVotes(votes);
        if (totalVotes && totalVotes.signatures) {
            library.logger.debug(`receive new votes, total votes number ${totalVotes.signatures.length}`);
        }
        if (library.base.consensus.hasEnoughVotes(totalVotes)) {
            const block = library.base.consensus.getPendingBlock();
            const height = block.height;
            const id = block.id;
            return (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    modules.transactions.clearUnconfirmed();
                    yield self.processBlock(block, { votes: totalVotes, local: true, broadcast: true });
                    library.logger.info(`Forged new block id: ${id}, height: ${height}, round: ${modules.round.calc(height)}, slot: ${slots.getSlotNumber(block.timestamp)}, reward: ${block.reward}`);
                }
                catch (err) {
                    library.logger.error(`Failed to process confirmed block height: ${height} id: ${id} error: ${err}`);
                }
                cb();
            }))();
        }
        return setImmediate(cb);
    });
};
Blocks.prototype.getSupply = () => {
    const height = priv.lastBlock.height;
    return priv.blockStatus.calcSupply(height);
};
Blocks.prototype.getCirculatingSupply = () => {
    const height = priv.lastBlock.height;
    return priv.blockStatus.calcSupply(height);
};
Blocks.prototype.isCollectingVotes = () => priv.isCollectingVotes;
Blocks.prototype.isHealthy = () => {
    const lastBlock = priv.lastBlock;
    const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
    return slots.getNextSlot() - lastSlot < 3 && !modules.loader.syncing();
};
Blocks.prototype.onBind = (scope) => {
    modules = scope;
    priv.loaded = true;
    return (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const count = app.sdb.blocksCount;
            app.logger.info('Blocks found:', count);
            if (!count) {
                self.setLastBlock({ height: -1 });
                yield self.processBlock(genesisblock.block, {});
            }
            else {
                const block = yield app.sdb.getBlockByHeight(count - 1);
                self.setLastBlock(block);
            }
            library.bus.message('blockchainReady');
        }
        catch (e) {
            app.logger.error('Failed to prepare local blockchain', e);
            process.exit(0);
        }
    }))();
};
Blocks.prototype.cleanup = (cb) => {
    priv.loaded = false;
    cb();
};
shared.getBlock = (req, cb) => {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    const query = req.body;
    return library.scheme.validate(query, {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 1,
            },
            height: {
                type: 'integer',
                minimum: 0,
            },
        },
    }, (err) => {
        if (err) {
            return cb(err[0].message);
        }
        return (() => __awaiter(this, void 0, void 0, function* () {
            try {
                let block;
                if (query.id) {
                    block = yield app.sdb.getBlockById(query.id);
                }
                else if (query.height !== undefined) {
                    block = yield app.sdb.getBlockByHeight(query.height);
                }
                if (!block) {
                    return cb('Block not found');
                }
                return cb(null, { block: self.toAPIV1Block(block) });
            }
            catch (e) {
                library.logger.error(e);
                return cb('Server error');
            }
        }))();
    });
};
shared.getFullBlock = (req, cb) => {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    const query = req.body;
    return library.scheme.validate(query, {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 1,
            },
            height: {
                type: 'integer',
                minimum: 0,
            },
        },
    }, (err) => {
        if (err) {
            return cb(err[0].message);
        }
        return (() => __awaiter(this, void 0, void 0, function* () {
            try {
                let block = undefined;
                if (query.id) {
                    block = yield app.sdb.getBlockById(query.id);
                }
                else if (query.height !== undefined) {
                    block = yield app.sdb.getBlockByHeight(query.height);
                }
                if (!block)
                    return cb('Block not found');
                const callback = (err, ret) => {
                    if (err)
                        return cb(err);
                    block = self.toAPIV1Block(block);
                    block.transactions = ret.transactions;
                    block.numberOfTransactions = isArray(block.transactions) ? block.transactions.length : 0;
                    return cb(null, { block });
                };
                req.body.blockId = block.id;
                req.body.unlimited = true;
                delete req.body.id;
                return modules.transactions.getTransactionsForV1(req, callback);
            }
            catch (e) {
                library.logger.error('Failed to find block', e);
                return cb('Server error');
            }
        }))();
    });
};
shared.getBlocks = (req, cb) => {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    const query = req.body;
    return library.scheme.validate(query, {
        type: 'object',
        properties: {
            limit: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
            },
            offset: {
                type: 'integer',
                minimum: 0,
            },
            generatorPublicKey: {
                type: 'string',
                format: 'publicKey',
            },
        },
    }, (err) => {
        if (err) {
            return cb(err[0].message);
        }
        return (() => __awaiter(this, void 0, void 0, function* () {
            try {
                const offset = query.offset ? Number(query.offset) : 0;
                const limit = query.limit ? Number(query.limit) : 20;
                let minHeight;
                let maxHeight;
                if (query.orderBy === 'height:desc') {
                    maxHeight = priv.lastBlock.height - offset;
                    minHeight = (maxHeight - limit) + 1;
                }
                else {
                    minHeight = offset;
                    maxHeight = (offset + limit) - 1;
                }
                const count = app.sdb.blocksCount;
                if (!count)
                    throw new Error('Failed to get blocks count');
                const blocks = yield app.sdb.getBlocksByHeightRange(minHeight, maxHeight);
                if (!blocks || !blocks.length)
                    return cb('No blocks');
                return cb(null, { count, blocks: self.toAPIV1Blocks(blocks) });
            }
            catch (e) {
                library.logger.error('Failed to find blocks', e);
                return cb('Server error');
            }
        }))();
    });
};
shared.getHeight = (req, cb) => {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    return cb(null, { height: priv.lastBlock.height });
};
shared.getMilestone = (req, cb) => {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    const height = priv.lastBlock.height;
    return cb(null, { milestone: priv.blockStatus.calcMilestone(height) });
};
shared.getReward = (req, cb) => {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    const height = priv.lastBlock.height;
    return cb(null, { reward: priv.blockStatus.calcReward(height) });
};
shared.getSupply = (req, cb) => {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    const height = priv.lastBlock.height;
    return cb(null, { supply: priv.blockStatus.calcSupply(height) });
};
shared.getStatus = (req, cb) => {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    const height = priv.lastBlock.height;
    return cb(null, {
        height,
        fee: library.base.block.calculateFee(),
        milestone: priv.blockStatus.calcMilestone(height),
        reward: priv.blockStatus.calcReward(height),
        supply: priv.blockStatus.calcSupply(height),
    });
};
module.exports = Blocks;
