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
module.exports = function (router) {
    router.get('/:address', function (req) {
        return __awaiter(_this, void 0, void 0, function () {
            var offset, limit, condition, count, balances, currencyMap, _i, balances_1, b, assetNameList, uiaNameList, gaNameList, assets, _a, assets_1, a, gatewayAssets, _b, gatewayAssets_1, a, _c, balances_2, b;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        offset = req.query.offset ? Number(req.query.offset) : 0;
                        limit = req.query.limit ? Number(req.query.limit) : 20;
                        condition = { address: req.params.address };
                        if (req.query.flag) {
                            condition.flag = Number(req.query.flag);
                        }
                        return [4, app.sdb.count('Balance', condition)];
                    case 1:
                        count = _d.sent();
                        balances = [];
                        if (!(count > 0))
                            return [3, 7];
                        return [4, app.sdb.findAll('Balance', { condition: condition, limit: limit, offset: offset })];
                    case 2:
                        balances = _d.sent();
                        currencyMap = new Map();
                        for (_i = 0, balances_1 = balances; _i < balances_1.length; _i++) {
                            b = balances_1[_i];
                            currencyMap.set(b.currency, 1);
                        }
                        assetNameList = Array.from(currencyMap.keys());
                        uiaNameList = assetNameList.filter(function (n) { return n.indexOf('.') !== -1; });
                        gaNameList = assetNameList.filter(function (n) { return n.indexOf('.') === -1; });
                        if (!(uiaNameList && uiaNameList.length))
                            return [3, 4];
                        return [4, app.sdb.findAll('Asset', {
                                condition: {
                                    name: { $in: uiaNameList },
                                },
                            })];
                    case 3:
                        assets = _d.sent();
                        for (_a = 0, assets_1 = assets; _a < assets_1.length; _a++) {
                            a = assets_1[_a];
                            currencyMap.set(a.name, a);
                        }
                        _d.label = 4;
                    case 4:
                        if (!(gaNameList && gaNameList.length))
                            return [3, 6];
                        return [4, app.sdb.findAll('GatewayCurrency', {
                                condition: {
                                    symbol: { $in: gaNameList },
                                },
                            })];
                    case 5:
                        gatewayAssets = _d.sent();
                        for (_b = 0, gatewayAssets_1 = gatewayAssets; _b < gatewayAssets_1.length; _b++) {
                            a = gatewayAssets_1[_b];
                            currencyMap.set(a.symbol, a);
                        }
                        _d.label = 6;
                    case 6:
                        for (_c = 0, balances_2 = balances; _c < balances_2.length; _c++) {
                            b = balances_2[_c];
                            b.asset = currencyMap.get(b.currency);
                        }
                        _d.label = 7;
                    case 7: return [2, { count: count, balances: balances }];
                }
            });
        });
    });
    router.get('/:address/:currency', function (req) {
        return __awaiter(_this, void 0, void 0, function () {
            var currency, condition, balance, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        currency = req.params.currency;
                        condition = {
                            address: req.params.address,
                            currency: currency,
                        };
                        return [4, app.sdb.findOne('Balance', { condition: condition })];
                    case 1:
                        balance = _c.sent();
                        if (!balance)
                            return [2, 'No balance'];
                        if (!(currency.indexOf('.') !== -1))
                            return [3, 3];
                        _a = balance;
                        return [4, app.sdb.findOne('Asset', { condition: { name: balance.currency } })];
                    case 2:
                        _a.asset = _c.sent();
                        return [3, 5];
                    case 3:
                        _b = balance;
                        return [4, app.sdb.findOne('GatewayCurrency', { condition: { symbol: balance.currency } })];
                    case 4:
                        _b.asset = _c.sent();
                        _c.label = 5;
                    case 5: return [2, { balance: balance }];
                }
            });
        });
    });
};
