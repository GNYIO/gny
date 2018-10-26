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
        const condition = {};
        if (req.params.address.length <= 20) {
            condition.name = req.params.address;
        }
        else {
            condition.address = req.params.address;
        }
        const account = yield app.sdb.findOne('Account', { condition });
        let unconfirmedAccount = null;
        if (account) {
            unconfirmedAccount = yield app.sdb.load('Account', account.address);
        }
        else {
            unconfirmedAccount = null;
        }
        const lastBlock = modules.blocks.getLastBlock();
        const ret = {
            account,
            unconfirmedAccount,
            latestBlock: {
                height: lastBlock.height,
                timestamp: lastBlock.timestamp,
            },
            version: modules.peer.getVersion(),
        };
        return ret;
    }));
};
