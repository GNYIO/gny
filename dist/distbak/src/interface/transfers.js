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
function getAssetMap(assetNames) {
    return __awaiter(this, void 0, void 0, function () {
        var assetMap, assetNameList, uiaNameList, gaNameList, assets, _i, assets_1, a, gatewayAssets, _a, gatewayAssets_1, a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    assetMap = new Map();
                    assetNameList = Array.from(assetNames.keys());
                    uiaNameList = assetNameList.filter(function (n) { return n.indexOf('.') !== -1; });
                    gaNameList = assetNameList.filter(function (n) { return n.indexOf('.') === -1; });
                    if (!(uiaNameList && uiaNameList.length))
                        return [3, 2];
                    return [4, app.sdb.findAll('Asset', {
                            condition: {
                                name: { $in: uiaNameList },
                            },
                        })];
                case 1:
                    assets = _b.sent();
                    for (_i = 0, assets_1 = assets; _i < assets_1.length; _i++) {
                        a = assets_1[_i];
                        assetMap.set(a.name, a);
                    }
                    _b.label = 2;
                case 2:
                    if (!(gaNameList && gaNameList.length))
                        return [3, 4];
                    return [4, app.sdb.findAll('GatewayCurrency', {
                            condition: {
                                symbol: { $in: gaNameList },
                            },
                        })];
                case 3:
                    gatewayAssets = _b.sent();
                    for (_a = 0, gatewayAssets_1 = gatewayAssets; _a < gatewayAssets_1.length; _a++) {
                        a = gatewayAssets_1[_a];
                        assetMap.set(a.symbol, a);
                    }
                    _b.label = 4;
                case 4: return [2, assetMap];
            }
        });
    });
}
function getTransactionMap(tids) {
    return __awaiter(this, void 0, void 0, function () {
        var trsMap, trs, _i, trs_1, t;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trsMap = new Map();
                    return [4, app.sdb.findAll('Transaction', {
                            condition: {
                                id: { $in: tids },
                            },
                        })];
                case 1:
                    trs = _a.sent();
                    for (_i = 0, trs_1 = trs; _i < trs_1.length; _i++) {
                        t = trs_1[_i];
                        trsMap.set(t.id, t);
                    }
                    return [2, trsMap];
            }
        });
    });
}
module.exports = function (router) {
    router.get('/', function (req) {
        return __awaiter(_this, void 0, void 0, function () {
            var ownerId, currency, condition, limit, offset, count, transfers, assetNames, _i, transfers_1, t, assetMap, tids, trsMap, _a, transfers_2, t, _b, transfers_3, t, pos;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ownerId = req.query.ownerId;
                        currency = req.query.currency;
                        condition = {};
                        limit = Number(req.query.limit) || 10;
                        offset = Number(req.query.offset) || 0;
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
                        return [4, app.sdb.count('Transfer', condition)];
                    case 1:
                        count = _c.sent();
                        transfers = [];
                        if (!(count > 0))
                            return [3, 5];
                        return [4, app.sdb.findAll('Transfer', {
                                condition: condition,
                                limit: limit,
                                offset: offset,
                                sort: { timestamp: -1 },
                            })];
                    case 2:
                        transfers = _c.sent();
                        assetNames = new Set();
                        for (_i = 0, transfers_1 = transfers; _i < transfers_1.length; _i++) {
                            t = transfers_1[_i];
                            if (t.currency !== 'AEC') {
                                assetNames.add(t.currency);
                            }
                        }
                        return [4, getAssetMap(assetNames)];
                    case 3:
                        assetMap = _c.sent();
                        tids = transfers.map(function (t) { return t.tid; });
                        return [4, getTransactionMap(tids)];
                    case 4:
                        trsMap = _c.sent();
                        for (_a = 0, transfers_2 = transfers; _a < transfers_2.length; _a++) {
                            t = transfers_2[_a];
                            if (t.currency !== 'AEC') {
                                t.asset = assetMap.get(t.currency);
                            }
                            t.transaction = trsMap.get(t.tid);
                        }
                        _c.label = 5;
                    case 5:
                        for (_b = 0, transfers_3 = transfers; _b < transfers_3.length; _b++) {
                            t = transfers_3[_b];
                            if (t.amount) {
                                pos = t.amount.indexOf('.');
                                if (pos !== -1) {
                                    t.amount = t.amount.slice(0, pos);
                                }
                            }
                        }
                        return [2, { count: count, transfers: transfers }];
                }
            });
        });
    });
    router.get('/amount', function (req) {
        return __awaiter(_this, void 0, void 0, function () {
            var startTimestamp, endTimestamp, condition, count, transfers, assetNames, _i, transfers_4, t, assetMap, tids, trsMap, _a, transfers_5, t, totalAmount, _b, transfers_6, t, pos, strTotalAmount;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        startTimestamp = req.query.startTimestamp;
                        endTimestamp = req.query.endTimestamp;
                        condition = {};
                        if (startTimestamp && endTimestamp) {
                            condition.timestamp = { $between: [startTimestamp, endTimestamp] };
                        }
                        condition.currency = 'AEC';
                        return [4, app.sdb.count('Transfer', condition)];
                    case 1:
                        count = _c.sent();
                        transfers = [];
                        if (!(count > 0))
                            return [3, 5];
                        return [4, app.sdb.findAll('Transfer', {
                                condition: condition,
                                sort: { timestamp: -1 },
                            })];
                    case 2:
                        transfers = _c.sent();
                        assetNames = new Set();
                        for (_i = 0, transfers_4 = transfers; _i < transfers_4.length; _i++) {
                            t = transfers_4[_i];
                            if (t.currency !== 'AEC') {
                                assetNames.add(t.currency);
                            }
                        }
                        return [4, getAssetMap(assetNames)];
                    case 3:
                        assetMap = _c.sent();
                        tids = transfers.map(function (t) { return t.tid; });
                        return [4, getTransactionMap(tids)];
                    case 4:
                        trsMap = _c.sent();
                        for (_a = 0, transfers_5 = transfers; _a < transfers_5.length; _a++) {
                            t = transfers_5[_a];
                            if (t.currency !== 'AEC') {
                                t.asset = assetMap.get(t.currency);
                            }
                            t.transaction = trsMap.get(t.tid);
                        }
                        _c.label = 5;
                    case 5:
                        totalAmount = 0;
                        for (_b = 0, transfers_6 = transfers; _b < transfers_6.length; _b++) {
                            t = transfers_6[_b];
                            if (t.amount) {
                                pos = t.amount.indexOf('.');
                                if (pos !== -1) {
                                    t.amount = t.amount.slice(0, pos);
                                }
                                totalAmount += Number(t.amount);
                            }
                        }
                        strTotalAmount = String(totalAmount);
                        return [2, { count: count, strTotalAmount: strTotalAmount }];
                }
            });
        });
    });
};
