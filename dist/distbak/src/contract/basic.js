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
function doCancelVote(account) {
    return __awaiter(this, void 0, void 0, function () {
        var voteList, _i, voteList_1, voteItem;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, app.sdb.findAll('Vote', { condition: { address: account.address } })];
                case 1:
                    voteList = _a.sent();
                    if (voteList && voteList.length > 0 && account.weight > 0) {
                        for (_i = 0, voteList_1 = voteList; _i < voteList_1.length; _i++) {
                            voteItem = voteList_1[_i];
                            app.sdb.increase('Delegate', { votes: -account.weight }, { name: voteItem.delegate });
                        }
                    }
                    return [2];
            }
        });
    });
}
function doCancelAgent(sender, agentAccount) {
    return __awaiter(this, void 0, void 0, function () {
        var agentClienteleKey, cancelWeight, voteList, _i, voteList_2, voteItem;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    agentClienteleKey = { clientele: sender.address };
                    cancelWeight = sender.weight;
                    agentAccount.agentWeight -= cancelWeight;
                    app.sdb.increase('Account', { agentWeight: -cancelWeight }, { address: agentAccount.address });
                    sender.agent = '';
                    app.sdb.update('Account', { agent: '' }, { address: sender.address });
                    app.sdb.del('AgentClientele', agentClienteleKey);
                    return [4, app.sdb.findAll('Vote', { condition: { address: agentAccount.address } })];
                case 1:
                    voteList = _a.sent();
                    if (voteList && voteList.length > 0 && cancelWeight > 0) {
                        for (_i = 0, voteList_2 = voteList; _i < voteList_2.length; _i++) {
                            voteItem = voteList_2[_i];
                            app.sdb.increase('Delegate', { votes: -cancelWeight }, { name: voteItem.delegate });
                        }
                    }
                    return [2];
            }
        });
    });
}
function isUniq(arr) {
    var s = new Set();
    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
        var i = arr_1[_i];
        if (s.has(i)) {
            return false;
        }
        s.add(i);
    }
    return true;
}
module.exports = {
    transfer: function (amount, recipient) {
        return __awaiter(this, void 0, void 0, function () {
            var sender, senderId, recipientAccount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!recipient)
                            return [2, 'Invalid recipient'];
                        app.validate('amount', String(amount));
                        amount = Number(amount);
                        sender = this.sender;
                        senderId = sender.address;
                        if (this.block.height > 0 && sender.aec < amount)
                            return [2, 'Insufficient balance'];
                        if (!(recipient && (app.util.address.isNormalAddress(recipient)
                            || app.util.address.isGroupAddress(recipient))))
                            return [3, 2];
                        return [4, app.sdb.load('Account', recipient)];
                    case 1:
                        recipientAccount = _a.sent();
                        if (recipientAccount) {
                            app.sdb.increase('Account', { aec: amount }, { address: recipientAccount.address });
                        }
                        else {
                            recipientAccount = app.sdb.create('Account', {
                                address: recipient,
                                aec: amount,
                                name: null,
                            });
                        }
                        return [3, 4];
                    case 2: return [4, app.sdb.load('Account', { name: recipient })];
                    case 3:
                        recipientAccount = _a.sent();
                        if (!recipientAccount)
                            return [2, 'Recipient name not exist'];
                        app.sdb.increase('Account', { aec: amount }, { address: recipientAccount.address });
                        _a.label = 4;
                    case 4:
                        app.sdb.increase('Account', { aec: -amount }, { address: sender.address });
                        app.sdb.create('Transfer', {
                            tid: this.trs.id,
                            height: this.block.height,
                            senderId: senderId,
                            recipientId: recipientAccount.address,
                            recipientName: recipientAccount.name,
                            currency: 'AEC',
                            amount: String(amount),
                            timestamp: this.trs.timestamp,
                        });
                        return [2, null];
                }
            });
        });
    },
    setName: function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var senderId, exists;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        app.validate('name', name);
                        senderId = this.sender.address;
                        app.sdb.lock("basic.account@" + senderId);
                        return [4, app.sdb.load('Account', { name: name })];
                    case 1:
                        exists = _a.sent();
                        if (exists)
                            return [2, 'Name already registered'];
                        if (this.sender.name)
                            return [2, 'Name already set'];
                        this.sender.name = name;
                        app.sdb.update('Account', { name: name }, { address: this.sender.address });
                        return [2, null];
                }
            });
        });
    },
    setPassword: function (publicKey) {
        return __awaiter(this, void 0, void 0, function () {
            var senderId;
            return __generator(this, function (_a) {
                app.validate('publickey', publicKey);
                if (!app.util.address.isNormalAddress(this.sender.address)) {
                    return [2, 'Invalid account type'];
                }
                senderId = this.sender.address;
                app.sdb.lock("basic.account@" + senderId);
                if (this.sender.secondPublicKey)
                    return [2, 'Password already set'];
                this.sender.secondPublicKey = publicKey;
                app.sdb.update('Account', { secondPublicKey: publicKey }, { address: this.sender.address });
                return [2, null];
            });
        });
    },
    lock: function (height, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var senderId, MIN_LOCK_HEIGHT, sender, agentAccount, voteList, _i, voteList_3, voteItem, voteList, _a, voteList_4, voteItem;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!Number.isInteger(height) || height <= 0)
                            return [2, 'Height should be positive integer'];
                        height = Number(height);
                        amount = Number(amount);
                        senderId = this.sender.address;
                        app.sdb.lock("basic.account@" + senderId);
                        MIN_LOCK_HEIGHT = 5760 * 30;
                        sender = this.sender;
                        if (sender.isAgent)
                            return [2, 'Agent account cannot lock'];
                        if (sender.aec - 100000000 < amount)
                            return [2, 'Insufficient balance'];
                        if (sender.isLocked) {
                            if (height !== 0
                                && height < (Math.max(this.block.height, sender.lockHeight) + MIN_LOCK_HEIGHT)) {
                                return [2, 'Invalid lock height'];
                            }
                            if (height === 0 && amount === 0) {
                                return [2, 'Invalid height or amount'];
                            }
                        }
                        else {
                            if (height < this.block.height + MIN_LOCK_HEIGHT) {
                                return [2, 'Invalid lock height'];
                            }
                            if (amount === 0) {
                                return [2, 'Invalid amount'];
                            }
                        }
                        if (!sender.isLocked) {
                            sender.isLocked = 1;
                        }
                        if (height !== 0) {
                            sender.lockHeight = height;
                        }
                        if (!(amount !== 0))
                            return [3, 5];
                        sender.aec -= amount;
                        sender.weight += amount;
                        app.sdb.update('Account', sender, { address: sender.address });
                        if (!sender.agent)
                            return [3, 3];
                        return [4, app.sdb.load('Account', { name: sender.agent })];
                    case 1:
                        agentAccount = _b.sent();
                        if (!agentAccount)
                            return [2, 'Agent account not found'];
                        app.sdb.increase('Account', { agentWeight: amount }, { address: agentAccount.address });
                        return [4, app.sdb.findAll('Vote', { condition: { address: agentAccount.address } })];
                    case 2:
                        voteList = _b.sent();
                        if (voteList && voteList.length > 0) {
                            for (_i = 0, voteList_3 = voteList; _i < voteList_3.length; _i++) {
                                voteItem = voteList_3[_i];
                                app.sdb.increase('Delegate', { votes: amount }, { name: voteItem.delegate });
                            }
                        }
                        return [3, 5];
                    case 3: return [4, app.sdb.findAll('Vote', { condition: { address: senderId } })];
                    case 4:
                        voteList = _b.sent();
                        if (voteList && voteList.length > 0) {
                            for (_a = 0, voteList_4 = voteList; _a < voteList_4.length; _a++) {
                                voteItem = voteList_4[_a];
                                app.sdb.increase('Delegate', { votes: amount }, { name: voteItem.delegate });
                            }
                        }
                        _b.label = 5;
                    case 5: return [2, null];
                }
            });
        });
    },
    unlock: function () {
        return __awaiter(this, void 0, void 0, function () {
            var senderId, sender, agentAccount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        senderId = this.sender.address;
                        app.sdb.lock("basic.account@" + senderId);
                        sender = this.sender;
                        if (!sender)
                            return [2, 'Account not found'];
                        if (!sender.isLocked)
                            return [2, 'Account is not locked'];
                        if (this.block.height <= sender.lockHeight)
                            return [2, 'Account cannot unlock'];
                        if (!!sender.agent)
                            return [3, 2];
                        return [4, doCancelVote(sender)];
                    case 1:
                        _a.sent();
                        return [3, 5];
                    case 2: return [4, app.sdb.load('Account', { name: sender.agent })];
                    case 3:
                        agentAccount = _a.sent();
                        if (!agentAccount)
                            return [2, 'Agent account not found'];
                        return [4, doCancelAgent(sender, agentAccount)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        sender.isLocked = 0;
                        sender.lockHeight = 0;
                        sender.aec += sender.weight;
                        sender.weight = 0;
                        app.sdb.update('Account', sender, { address: senderId });
                        return [2, null];
                }
            });
        });
    },
    registerDelegate: function () {
        return __awaiter(this, void 0, void 0, function () {
            var senderId, sender;
            return __generator(this, function (_a) {
                senderId = this.sender.address;
                if (this.block.height > 0)
                    app.sdb.lock("basic.account@" + senderId);
                sender = this.sender;
                if (!sender)
                    return [2, 'Account not found'];
                if (!sender.name)
                    return [2, 'Account has not a name'];
                if (sender.role)
                    return [2, 'Account already have a role'];
                app.sdb.create('Delegate', {
                    address: senderId,
                    name: sender.name,
                    tid: this.trs.id,
                    publicKey: this.trs.senderPublicKey,
                    votes: 0,
                    producedBlocks: 0,
                    missedBlocks: 0,
                    fees: 0,
                    rewards: 0,
                });
                sender.isDelegate = 1;
                sender.role = app.AccountRole.DELEGATE;
                app.sdb.update('Account', { isDelegate: 1, role: app.AccountRole.DELEGATE }, { address: senderId });
                return [2, null];
            });
        });
    },
    vote: function (delegates) {
        return __awaiter(this, void 0, void 0, function () {
            var senderId, sender, currentVotes, currentVotedDelegates, _i, currentVotes_1, v, _a, delegates_1, name, _b, delegates_2, name, exists, _c, delegates_3, name, votes;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        senderId = this.sender.address;
                        app.sdb.lock("basic.account@" + senderId);
                        sender = this.sender;
                        if (!sender.isAgent && !sender.isLocked)
                            return [2, 'Account is not locked'];
                        if (sender.agent)
                            return [2, 'Account already set agent'];
                        delegates = delegates.split(',');
                        if (!delegates || !delegates.length)
                            return [2, 'Invalid delegates'];
                        if (delegates.length > 33)
                            return [2, 'Voting limit exceeded'];
                        if (!isUniq(delegates))
                            return [2, 'Duplicated vote item'];
                        return [4, app.sdb.findAll('Vote', { condition: { address: senderId } })];
                    case 1:
                        currentVotes = _d.sent();
                        if (currentVotes) {
                            if (currentVotes.length + delegates.length > 101) {
                                return [2, 'Maximum number of votes exceeded'];
                            }
                            currentVotedDelegates = new Set();
                            for (_i = 0, currentVotes_1 = currentVotes; _i < currentVotes_1.length; _i++) {
                                v = currentVotes_1[_i];
                                currentVotedDelegates.add(v.delegate);
                            }
                            for (_a = 0, delegates_1 = delegates; _a < delegates_1.length; _a++) {
                                name = delegates_1[_a];
                                if (currentVotedDelegates.has(name)) {
                                    return [2, "Delegate already voted: " + name];
                                }
                            }
                        }
                        _b = 0, delegates_2 = delegates;
                        _d.label = 2;
                    case 2:
                        if (!(_b < delegates_2.length))
                            return [3, 5];
                        name = delegates_2[_b];
                        return [4, app.sdb.exists('Delegate', { name: name })];
                    case 3:
                        exists = _d.sent();
                        if (!exists)
                            return [2, "Voted delegate not exists: " + name];
                        _d.label = 4;
                    case 4:
                        _b++;
                        return [3, 2];
                    case 5:
                        for (_c = 0, delegates_3 = delegates; _c < delegates_3.length; _c++) {
                            name = delegates_3[_c];
                            votes = (sender.weight + sender.agentWeight);
                            app.sdb.increase('Delegate', { votes: votes }, { name: name });
                            app.sdb.create('Vote', {
                                address: senderId,
                                delegate: name,
                            });
                        }
                        return [2, null];
                }
            });
        });
    },
    unvote: function (delegates) {
        return __awaiter(this, void 0, void 0, function () {
            var senderId, sender, currentVotes, currentVotedDelegates, _i, currentVotes_2, v, _a, delegates_4, name, _b, delegates_5, name, exists, _c, delegates_6, name, votes;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        senderId = this.sender.address;
                        app.sdb.lock("account@" + senderId);
                        sender = this.sender;
                        if (!sender.isAgent && !sender.isLocked)
                            return [2, 'Account is not locked'];
                        if (sender.agent)
                            return [2, 'Account already set agent'];
                        delegates = delegates.split(',');
                        if (!delegates || !delegates.length)
                            return [2, 'Invalid delegates'];
                        if (delegates.length > 33)
                            return [2, 'Voting limit exceeded'];
                        if (!isUniq(delegates))
                            return [2, 'Duplicated vote item'];
                        return [4, app.sdb.findAll('Vote', { condition: { address: senderId } })];
                    case 1:
                        currentVotes = _d.sent();
                        if (currentVotes) {
                            currentVotedDelegates = new Set();
                            for (_i = 0, currentVotes_2 = currentVotes; _i < currentVotes_2.length; _i++) {
                                v = currentVotes_2[_i];
                                currentVotedDelegates.add(v.delegate);
                            }
                            for (_a = 0, delegates_4 = delegates; _a < delegates_4.length; _a++) {
                                name = delegates_4[_a];
                                if (!currentVotedDelegates.has(name)) {
                                    return [2, "Delegate not voted yet: " + name];
                                }
                            }
                        }
                        _b = 0, delegates_5 = delegates;
                        _d.label = 2;
                    case 2:
                        if (!(_b < delegates_5.length))
                            return [3, 5];
                        name = delegates_5[_b];
                        return [4, app.sdb.exists('Delegate', { name: name })];
                    case 3:
                        exists = _d.sent();
                        if (!exists)
                            return [2, "Voted delegate not exists: " + name];
                        _d.label = 4;
                    case 4:
                        _b++;
                        return [3, 2];
                    case 5:
                        for (_c = 0, delegates_6 = delegates; _c < delegates_6.length; _c++) {
                            name = delegates_6[_c];
                            votes = -(sender.weight + sender.agentWeight);
                            app.sdb.increase('Delegate', { votes: votes }, { name: name });
                            app.sdb.del('Vote', { address: senderId, delegate: name });
                        }
                        return [2, null];
                }
            });
        });
    },
};
