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
function isProposalApproved(pid, topic) {
    return __awaiter(this, void 0, void 0, function () {
        var proposal, votes, validVoteCount, _i, votes_1, v;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, app.sdb.load('Proposal', pid)];
                case 1:
                    proposal = _a.sent();
                    if (!proposal)
                        throw new Error('Proposal not found');
                    if (topic !== proposal.topic) {
                        throw new Error('Unexpected proposal topic');
                    }
                    if (proposal.activated)
                        return [2, 'Already activated'];
                    return [4, app.sdb.findAll('ProposalVote', { condition: { pid: pid } })];
                case 2:
                    votes = _a.sent();
                    validVoteCount = 0;
                    for (_i = 0, votes_1 = votes; _i < votes_1.length; _i++) {
                        v = votes_1[_i];
                        if (app.isCurrentBookkeeper(v.voter)) {
                            validVoteCount++;
                        }
                    }
                    if (validVoteCount <= Math.ceil(101 * 0.51))
                        return [2, 'Vote not enough'];
                    return [2, true];
            }
        });
    });
}
module.exports = {
    registerIssuer: function (name, desc) {
        return __awaiter(this, void 0, void 0, function () {
            var descJson, senderId, exists;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!/^[A-Za-z]{1,16}$/.test(name))
                            return [2, 'Invalid issuer name'];
                        if (!desc)
                            return [2, 'No issuer description was provided'];
                        descJson = JSON.stringify(desc);
                        if (descJson.length > 4096)
                            return [2, 'Invalid issuer description'];
                        senderId = this.sender.address;
                        app.sdb.lock("uia.registerIssuer@" + senderId);
                        return [4, app.sdb.exists('Issuer', { name: name })];
                    case 1:
                        exists = _a.sent();
                        if (exists)
                            return [2, 'Issuer name already exists'];
                        return [4, app.sdb.exists('Issuer', { issuerId: senderId })];
                    case 2:
                        exists = _a.sent();
                        if (exists)
                            return [2, 'Account is already an issuer'];
                        app.sdb.create('Issuer', {
                            tid: this.trs.id,
                            issuerId: senderId,
                            name: name,
                            desc: descJson,
                        });
                        return [2, null];
                }
            });
        });
    },
    registerAsset: function (symbol, desc, maximum, precision) {
        return __awaiter(this, void 0, void 0, function () {
            var issuer, fullName;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!/^[A-Z]{3,6}$/.test(symbol))
                            return [2, 'Invalid symbol'];
                        if (desc.length > 4096)
                            return [2, 'Invalid asset description'];
                        if (!Number.isInteger(precision) || precision <= 0)
                            return [2, 'Precision should be positive integer'];
                        if (precision > 16 || precision < 0)
                            return [2, 'Invalid asset precision'];
                        app.validate('amount', maximum);
                        return [4, app.sdb.findOne('Issuer', { condition: { issuerId: this.sender.address } })];
                    case 1:
                        issuer = _a.sent();
                        if (!issuer)
                            return [2, 'Account is not an issuer'];
                        fullName = issuer.name + "." + symbol;
                        app.sdb.lock("uia.registerAsset@" + fullName);
                        return [4, app.sdb.exists('Asset', { name: fullName })];
                    case 2:
                        exists = _a.sent();
                        if (exists)
                            return [2, 'Asset already exists'];
                        app.sdb.create('Asset', {
                            tid: this.trs.id,
                            timestamp: this.trs.timestamp,
                            name: fullName,
                            desc: desc,
                            maximum: maximum,
                            precision: precision,
                            quantity: '0',
                            issuerId: this.sender.address,
                        });
                        return [2, null];
                }
            });
        });
    },
    issue: function (pid) {
        return __awaiter(this, void 0, void 0, function () {
            var proposal, content, name, amount, asset, quantity;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, app.sdb.findOne('Proposal', { condition: { tid: pid } })];
                    case 1:
                        proposal = _a.sent();
                        if (!proposal)
                            return [2, 'Proposal not found'];
                        if (proposal.activated)
                            return [2, 'Proposal was already activated'];
                        if (!isProposalApproved(pid, 'asset_issue'))
                            return [2, 'Proposal is not approved'];
                        content = JSON.parse(proposal.content);
                        name = content.currency;
                        amount = content.amount;
                        if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(name))
                            return [2, 'Invalid currency'];
                        app.validate('amount', amount);
                        app.sdb.lock("uia.issue@" + name);
                        return [4, app.sdb.load('Asset', name)];
                    case 2:
                        asset = _a.sent();
                        if (!asset)
                            return [2, 'Asset not exists'];
                        if (asset.issuerId !== this.sender.address)
                            return [2, 'Permission denied'];
                        quantity = app.util.bignumber(asset.quantity).plus(amount);
                        if (quantity.gt(asset.maximum))
                            return [2, 'Exceed issue limit'];
                        asset.quantity = quantity.toString(10);
                        app.sdb.update('Asset', { quantity: asset.quantity }, { name: name });
                        app.balances.increase(this.sender.address, name, amount);
                        app.sdb.update('Proposal', { activated: 1 }, { tid: pid });
                        return [2, null];
                }
            });
        });
    },
    transfer: function (currency, amount, recipient) {
        return __awaiter(this, void 0, void 0, function () {
            var senderId, balance, recipientAddress, recipientName, recipientAccount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (currency.length > 30)
                            return [2, 'Invalid currency'];
                        if (!recipient || recipient.length > 50)
                            return [2, 'Invalid recipient'];
                        app.validate('amount', String(amount));
                        senderId = this.sender.address;
                        balance = app.balances.get(senderId, currency);
                        if (balance.lt(amount))
                            return [2, 'Insufficient balance'];
                        recipientName = '';
                        if (!(recipient && (app.util.address.isNormalAddress(recipient)
                            || app.util.address.isGroupAddress(recipient))))
                            return [3, 1];
                        recipientAddress = recipient;
                        return [3, 3];
                    case 1:
                        recipientName = recipient;
                        return [4, app.sdb.findOne('Account', { condition: { name: recipient } })];
                    case 2:
                        recipientAccount = _a.sent();
                        if (!recipientAccount)
                            return [2, 'Recipient name not exist'];
                        recipientAddress = recipientAccount.address;
                        _a.label = 3;
                    case 3:
                        app.balances.transfer(currency, amount, senderId, recipientAddress);
                        app.sdb.create('Transfer', {
                            tid: this.trs.id,
                            height: this.block.height,
                            senderId: senderId,
                            recipientId: recipientAddress,
                            recipientName: recipientName,
                            currency: currency,
                            amount: amount,
                            timestamp: this.trs.timestamp,
                        });
                        return [2, null];
                }
            });
        });
    },
};
