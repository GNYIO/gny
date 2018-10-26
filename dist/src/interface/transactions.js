"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function defined(obj) {
    return typeof obj !== 'undefined';
}
module.exports = (router) => {
    router.get('/', (req) => __awaiter(this, void 0, void 0, function* () {
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const sort = {};
        if (req.query.orderBy) {
            const orderBy = req.query.orderBy.split(':');
            sort[orderBy[0]] = orderBy[1] === 'desc' ? -1 : 1;
        }
        let transactions = [];
        const condition = {};
        if (defined(req.query.type))
            condition.type = Number(req.query.type);
        if (defined(req.query.height))
            condition.height = Number(req.query.height);
        if (defined(req.query.senderId))
            condition.senderId = req.query.senderId;
        if (defined(req.query.message))
            condition.message = req.query.message;
        const count = yield app.sdb.count('Transaction', condition);
        if (count > 0) {
            transactions = yield app.sdb.findAll('Transaction', {
                condition, offset, limit, sort,
            });
        }
        return { transactions, count };
    }));
    router.get('/:id', (req) => __awaiter(this, void 0, void 0, function* () {
        const trs = yield app.sdb.findOne('Transaction', { condition: { id: req.params.id } });
        if (!trs)
            throw new Error('Transaction no found');
        return { transaction: trs };
    }));
};
