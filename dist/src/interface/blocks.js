"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const _ = require('lodash');
module.exports = (router) => {
    router.get('/', (req) => __awaiter(this, void 0, void 0, function* () {
        const query = req.query;
        const offset = query.offset ? Number(query.offset) : 0;
        const limit = query.limit ? Number(query.limit) : 20;
        let minHeight;
        let maxHeight;
        let needReverse = false;
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
        const withTransactions = !!query.transactions;
        let blocks = yield modules.blocks.getBlocks(minHeight, maxHeight, withTransactions);
        if (needReverse) {
            blocks = _.reverse(blocks);
        }
        const count = app.sdb.blocksCount;
        return { count, blocks };
    }));
    router.get('/:idOrHeight', (req) => __awaiter(this, void 0, void 0, function* () {
        const idOrHeight = req.params.idOrHeight;
        let block;
        if (idOrHeight.length === 64) {
            let id = idOrHeight;
            block = yield app.sdb.getBlockById(id);
        }
        else {
            let height = Number(idOrHeight);
            if (Number.isInteger(height) && height >= 0) {
                block = yield app.sdb.getBlockByHeight(height);
            }
        }
        if (!block)
            throw new Error('Block not found');
        if (!!req.query.transactions) {
            const transactions = yield app.sdb.findAll('Transaction', {
                condition: {
                    height: block.height,
                },
            });
            block.transactions = transactions;
        }
        return { block };
    }));
};
