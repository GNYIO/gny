"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
module.exports = (router) => {
    router.get('/:address', (req) => __awaiter(this, void 0, void 0, function* () {
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const condition = { address: req.params.address };
        if (req.query.flag) {
            condition.flag = Number(req.query.flag);
        }
        const count = yield app.sdb.count('Balance', condition);
        let balances = [];
        if (count > 0) {
            balances = yield app.sdb.findAll('Balance', { condition, limit, offset });
            const currencyMap = new Map();
            for (const b of balances) {
                currencyMap.set(b.currency, 1);
            }
            const assetNameList = Array.from(currencyMap.keys());
            const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1);
            const gaNameList = assetNameList.filter(n => n.indexOf('.') === -1);
            if (uiaNameList && uiaNameList.length) {
                const assets = yield app.sdb.findAll('Asset', {
                    condition: {
                        name: { $in: uiaNameList },
                    },
                });
                for (const a of assets) {
                    currencyMap.set(a.name, a);
                }
            }
            if (gaNameList && gaNameList.length) {
                const gatewayAssets = yield app.sdb.findAll('GatewayCurrency', {
                    condition: {
                        symbol: { $in: gaNameList },
                    },
                });
                for (const a of gatewayAssets) {
                    currencyMap.set(a.symbol, a);
                }
            }
            for (const b of balances) {
                b.asset = currencyMap.get(b.currency);
            }
        }
        return { count, balances };
    }));
    router.get('/:address/:currency', (req) => __awaiter(this, void 0, void 0, function* () {
        const currency = req.params.currency;
        const condition = {
            address: req.params.address,
            currency,
        };
        const balance = yield app.sdb.findOne('Balance', { condition });
        if (!balance)
            return 'No balance';
        if (currency.indexOf('.') !== -1) {
            balance.asset = yield app.sdb.findOne('Asset', { condition: { name: balance.currency } });
        }
        else {
            balance.asset = yield app.sdb.findOne('GatewayCurrency', { condition: { symbol: balance.currency } });
        }
        return { balance };
    }));
};
