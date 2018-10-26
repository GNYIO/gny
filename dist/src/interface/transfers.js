"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getAssetMap(assetNames) {
    return __awaiter(this, void 0, void 0, function* () {
        const assetMap = new Map();
        const assetNameList = Array.from(assetNames.keys());
        const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1);
        const gaNameList = assetNameList.filter(n => n.indexOf('.') === -1);
        if (uiaNameList && uiaNameList.length) {
            const assets = yield app.sdb.findAll('Asset', {
                condition: {
                    name: { $in: uiaNameList },
                },
            });
            for (const a of assets) {
                assetMap.set(a.name, a);
            }
        }
        if (gaNameList && gaNameList.length) {
            const gatewayAssets = yield app.sdb.findAll('GatewayCurrency', {
                condition: {
                    symbol: { $in: gaNameList },
                },
            });
            for (const a of gatewayAssets) {
                assetMap.set(a.symbol, a);
            }
        }
        return assetMap;
    });
}
function getTransactionMap(tids) {
    return __awaiter(this, void 0, void 0, function* () {
        const trsMap = new Map();
        const trs = yield app.sdb.findAll('Transaction', {
            condition: {
                id: { $in: tids },
            },
        });
        for (const t of trs) {
            trsMap.set(t.id, t);
        }
        return trsMap;
    });
}
module.exports = (router) => {
    router.get('/', (req) => __awaiter(this, void 0, void 0, function* () {
        const ownerId = req.query.ownerId;
        const currency = req.query.currency;
        const condition = {};
        const limit = Number(req.query.limit) || 10;
        const offset = Number(req.query.offset) || 0;
        if (ownerId) {
            condition.$or = {
                senderId: ownerId,
                recipientId: ownerId,
            };
        }
        if (currency) {
            condition.currency = currency;
        }
        if (req.query.senderId) {
            condition.senderId = req.query.senderId;
        }
        if (req.query.recipientId) {
            condition.recipientId = req.query.recipientId;
        }
        const count = yield app.sdb.count('Transfer', condition);
        let transfers = [];
        if (count > 0) {
            transfers = yield app.sdb.findAll('Transfer', {
                condition,
                limit,
                offset,
                sort: { timestamp: -1 },
            });
            const assetNames = new Set();
            for (const t of transfers) {
                if (t.currency !== 'AEC') {
                    assetNames.add(t.currency);
                }
            }
            const assetMap = yield getAssetMap(assetNames);
            const tids = transfers.map(t => t.tid);
            const trsMap = yield getTransactionMap(tids);
            for (const t of transfers) {
                if (t.currency !== 'AEC') {
                    t.asset = assetMap.get(t.currency);
                }
                t.transaction = trsMap.get(t.tid);
            }
        }
        for (const t of transfers) {
            if (t.amount) {
                const pos = t.amount.indexOf('.');
                if (pos !== -1) {
                    t.amount = t.amount.slice(0, pos);
                }
            }
        }
        return { count, transfers };
    }));
    router.get('/amount', (req) => __awaiter(this, void 0, void 0, function* () {
        const startTimestamp = req.query.startTimestamp;
        const endTimestamp = req.query.endTimestamp;
        const condition = {};
        if (startTimestamp && endTimestamp) {
            condition.timestamp = { $between: [startTimestamp, endTimestamp] };
        }
        condition.currency = 'AEC';
        const count = yield app.sdb.count('Transfer', condition);
        let transfers = [];
        if (count > 0) {
            transfers = yield app.sdb.findAll('Transfer', {
                condition,
                sort: { timestamp: -1 },
            });
            const assetNames = new Set();
            for (const t of transfers) {
                if (t.currency !== 'AEC') {
                    assetNames.add(t.currency);
                }
            }
            const assetMap = yield getAssetMap(assetNames);
            const tids = transfers.map(t => t.tid);
            const trsMap = yield getTransactionMap(tids);
            for (const t of transfers) {
                if (t.currency !== 'AEC') {
                    t.asset = assetMap.get(t.currency);
                }
                t.transaction = trsMap.get(t.tid);
            }
        }
        let totalAmount = 0;
        for (const t of transfers) {
            if (t.amount) {
                const pos = t.amount.indexOf('.');
                if (pos !== -1) {
                    t.amount = t.amount.slice(0, pos);
                }
                totalAmount += Number(t.amount);
            }
        }
        const strTotalAmount = String(totalAmount);
        return { count, strTotalAmount };
    }));
};
