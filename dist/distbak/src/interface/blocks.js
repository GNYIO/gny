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
var _ = require('lodash');
module.exports = function (router) {
    router.get('/', function (req) {
        return __awaiter(_this, void 0, void 0, function () {
            var query, offset, limit, minHeight, maxHeight, needReverse, withTransactions, blocks, count;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = req.query;
                        offset = query.offset ? Number(query.offset) : 0;
                        limit = query.limit ? Number(query.limit) : 20;
                        needReverse = false;
                        if (query.orderBy === 'height:desc') {
                            needReverse = true;
                            maxHeight = modules.blocks.getLastBlock().height - offset;
                            minHeight = (maxHeight - limit) + 1;
                            minHeight = minHeight > 0 ? minHeight : 0;
                        }
                        else {
                            minHeight = offset;
                            maxHeight = (offset + limit) - 1;
                        }
                        withTransactions = !!query.transactions;
                        return [4, modules.blocks.getBlocks(minHeight, maxHeight, withTransactions)];
                    case 1:
                        blocks = _a.sent();
                        if (needReverse) {
                            blocks = _.reverse(blocks);
                        }
                        count = app.sdb.blocksCount;
                        return [2, { count: count, blocks: blocks }];
                }
            });
        });
    });
    router.get('/:idOrHeight', function (req) {
        return __awaiter(_this, void 0, void 0, function () {
            var idOrHeight, block, id, height, transactions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        idOrHeight = req.params.idOrHeight;
                        if (!(idOrHeight.length === 64))
                            return [3, 2];
                        id = idOrHeight;
                        return [4, app.sdb.getBlockById(id)];
                    case 1:
                        block = _a.sent();
                        return [3, 4];
                    case 2:
                        height = Number(idOrHeight);
                        if (!(Number.isInteger(height) && height >= 0))
                            return [3, 4];
                        return [4, app.sdb.getBlockByHeight(height)];
                    case 3:
                        block = _a.sent();
                        _a.label = 4;
                    case 4:
                        if (!block)
                            throw new Error('Block not found');
                        if (!!!req.query.transactions)
                            return [3, 6];
                        return [4, app.sdb.findAll('Transaction', {
                                condition: {
                                    height: block.height,
                                },
                            })];
                    case 5:
                        transactions = _a.sent();
                        block.transactions = transactions;
                        _a.label = 6;
                    case 6: return [2, { block: block }];
                }
            });
        });
    });
};
