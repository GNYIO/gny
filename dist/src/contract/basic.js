"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function doCancelVote(account) {
    return __awaiter(this, void 0, void 0, function* () {
        const voteList = yield app.sdb.findAll('Vote', { condition: { address: account.address } });
        if (voteList && voteList.length > 0 && account.weight > 0) {
            for (const voteItem of voteList) {
                app.sdb.increase('Delegate', { votes: -account.weight }, { name: voteItem.delegate });
            }
        }
    });
}
function doCancelAgent(sender, agentAccount) {
    return __awaiter(this, void 0, void 0, function* () {
        const agentClienteleKey = { clientele: sender.address };
        const cancelWeight = sender.weight;
        agentAccount.agentWeight -= cancelWeight;
        app.sdb.increase('Account', { agentWeight: -cancelWeight }, { address: agentAccount.address });
        sender.agent = '';
        app.sdb.update('Account', { agent: '' }, { address: sender.address });
        app.sdb.del('AgentClientele', agentClienteleKey);
        const voteList = yield app.sdb.findAll('Vote', { condition: { address: agentAccount.address } });
        if (voteList && voteList.length > 0 && cancelWeight > 0) {
            for (const voteItem of voteList) {
                app.sdb.increase('Delegate', { votes: -cancelWeight }, { name: voteItem.delegate });
            }
        }
    });
}
function isUniq(arr) {
    const s = new Set();
    for (const i of arr) {
        if (s.has(i)) {
            return false;
        }
        s.add(i);
    }
    return true;
}
module.exports = {
    transfer(amount, recipient) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!recipient)
                return 'Invalid recipient';
            app.validate('amount', String(amount));
            amount = Number(amount);
            const sender = this.sender;
            const senderId = sender.address;
            if (this.block.height > 0 && sender.aec < amount)
                return 'Insufficient balance';
            let recipientAccount;
            if (recipient && (app.util.address.isNormalAddress(recipient)
                || app.util.address.isGroupAddress(recipient))) {
                recipientAccount = yield app.sdb.load('Account', recipient);
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
            }
            else {
                recipientAccount = yield app.sdb.load('Account', { name: recipient });
                if (!recipientAccount)
                    return 'Recipient name not exist';
                app.sdb.increase('Account', { aec: amount }, { address: recipientAccount.address });
            }
            app.sdb.increase('Account', { aec: -amount }, { address: sender.address });
            app.sdb.create('Transfer', {
                tid: this.trs.id,
                height: this.block.height,
                senderId,
                recipientId: recipientAccount.address,
                recipientName: recipientAccount.name,
                currency: 'AEC',
                amount: String(amount),
                timestamp: this.trs.timestamp,
            });
            return null;
        });
    },
    setName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            app.validate('name', name);
            const senderId = this.sender.address;
            app.sdb.lock(`basic.account@${senderId}`);
            const exists = yield app.sdb.load('Account', { name });
            if (exists)
                return 'Name already registered';
            if (this.sender.name)
                return 'Name already set';
            this.sender.name = name;
            app.sdb.update('Account', { name }, { address: this.sender.address });
            return null;
        });
    },
    setPassword(publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            app.validate('publickey', publicKey);
            if (!app.util.address.isNormalAddress(this.sender.address)) {
                return 'Invalid account type';
            }
            const senderId = this.sender.address;
            app.sdb.lock(`basic.account@${senderId}`);
            if (this.sender.secondPublicKey)
                return 'Password already set';
            this.sender.secondPublicKey = publicKey;
            app.sdb.update('Account', { secondPublicKey: publicKey }, { address: this.sender.address });
            return null;
        });
    },
    lock(height, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Number.isInteger(height) || height <= 0)
                return 'Height should be positive integer';
            height = Number(height);
            amount = Number(amount);
            const senderId = this.sender.address;
            app.sdb.lock(`basic.account@${senderId}`);
            const MIN_LOCK_HEIGHT = 5760 * 30;
            const sender = this.sender;
            if (sender.isAgent)
                return 'Agent account cannot lock';
            if (sender.aec - 100000000 < amount)
                return 'Insufficient balance';
            if (sender.isLocked) {
                if (height !== 0
                    && height < (Math.max(this.block.height, sender.lockHeight) + MIN_LOCK_HEIGHT)) {
                    return 'Invalid lock height';
                }
                if (height === 0 && amount === 0) {
                    return 'Invalid height or amount';
                }
            }
            else {
                if (height < this.block.height + MIN_LOCK_HEIGHT) {
                    return 'Invalid lock height';
                }
                if (amount === 0) {
                    return 'Invalid amount';
                }
            }
            if (!sender.isLocked) {
                sender.isLocked = 1;
            }
            if (height !== 0) {
                sender.lockHeight = height;
            }
            if (amount !== 0) {
                sender.aec -= amount;
                sender.weight += amount;
                app.sdb.update('Account', sender, { address: sender.address });
                if (sender.agent) {
                    const agentAccount = yield app.sdb.load('Account', { name: sender.agent });
                    if (!agentAccount)
                        return 'Agent account not found';
                    app.sdb.increase('Account', { agentWeight: amount }, { address: agentAccount.address });
                    const voteList = yield app.sdb.findAll('Vote', { condition: { address: agentAccount.address } });
                    if (voteList && voteList.length > 0) {
                        for (const voteItem of voteList) {
                            app.sdb.increase('Delegate', { votes: amount }, { name: voteItem.delegate });
                        }
                    }
                }
                else {
                    const voteList = yield app.sdb.findAll('Vote', { condition: { address: senderId } });
                    if (voteList && voteList.length > 0) {
                        for (const voteItem of voteList) {
                            app.sdb.increase('Delegate', { votes: amount }, { name: voteItem.delegate });
                        }
                    }
                }
            }
            return null;
        });
    },
    unlock() {
        return __awaiter(this, void 0, void 0, function* () {
            const senderId = this.sender.address;
            app.sdb.lock(`basic.account@${senderId}`);
            const sender = this.sender;
            if (!sender)
                return 'Account not found';
            if (!sender.isLocked)
                return 'Account is not locked';
            if (this.block.height <= sender.lockHeight)
                return 'Account cannot unlock';
            if (!sender.agent) {
                yield doCancelVote(sender);
            }
            else {
                const agentAccount = yield app.sdb.load('Account', { name: sender.agent });
                if (!agentAccount)
                    return 'Agent account not found';
                yield doCancelAgent(sender, agentAccount);
            }
            sender.isLocked = 0;
            sender.lockHeight = 0;
            sender.aec += sender.weight;
            sender.weight = 0;
            app.sdb.update('Account', sender, { address: senderId });
            return null;
        });
    },
    registerDelegate() {
        return __awaiter(this, void 0, void 0, function* () {
            const senderId = this.sender.address;
            if (this.block.height > 0)
                app.sdb.lock(`basic.account@${senderId}`);
            const sender = this.sender;
            if (!sender)
                return 'Account not found';
            if (!sender.name)
                return 'Account has not a name';
            if (sender.role)
                return 'Account already have a role';
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
            return null;
        });
    },
    vote(delegates) {
        return __awaiter(this, void 0, void 0, function* () {
            const senderId = this.sender.address;
            app.sdb.lock(`basic.account@${senderId}`);
            const sender = this.sender;
            if (!sender.isAgent && !sender.isLocked)
                return 'Account is not locked';
            if (sender.agent)
                return 'Account already set agent';
            delegates = delegates.split(',');
            if (!delegates || !delegates.length)
                return 'Invalid delegates';
            if (delegates.length > 33)
                return 'Voting limit exceeded';
            if (!isUniq(delegates))
                return 'Duplicated vote item';
            const currentVotes = yield app.sdb.findAll('Vote', { condition: { address: senderId } });
            if (currentVotes) {
                if (currentVotes.length + delegates.length > 101) {
                    return 'Maximum number of votes exceeded';
                }
                const currentVotedDelegates = new Set();
                for (const v of currentVotes) {
                    currentVotedDelegates.add(v.delegate);
                }
                for (const name of delegates) {
                    if (currentVotedDelegates.has(name)) {
                        return `Delegate already voted: ${name}`;
                    }
                }
            }
            for (const name of delegates) {
                const exists = yield app.sdb.exists('Delegate', { name });
                if (!exists)
                    return `Voted delegate not exists: ${name}`;
            }
            for (const name of delegates) {
                const votes = (sender.weight + sender.agentWeight);
                app.sdb.increase('Delegate', { votes }, { name });
                app.sdb.create('Vote', {
                    address: senderId,
                    delegate: name,
                });
            }
            return null;
        });
    },
    unvote(delegates) {
        return __awaiter(this, void 0, void 0, function* () {
            const senderId = this.sender.address;
            app.sdb.lock(`account@${senderId}`);
            const sender = this.sender;
            if (!sender.isAgent && !sender.isLocked)
                return 'Account is not locked';
            if (sender.agent)
                return 'Account already set agent';
            delegates = delegates.split(',');
            if (!delegates || !delegates.length)
                return 'Invalid delegates';
            if (delegates.length > 33)
                return 'Voting limit exceeded';
            if (!isUniq(delegates))
                return 'Duplicated vote item';
            const currentVotes = yield app.sdb.findAll('Vote', { condition: { address: senderId } });
            if (currentVotes) {
                const currentVotedDelegates = new Set();
                for (const v of currentVotes) {
                    currentVotedDelegates.add(v.delegate);
                }
                for (const name of delegates) {
                    if (!currentVotedDelegates.has(name)) {
                        return `Delegate not voted yet: ${name}`;
                    }
                }
            }
            for (const name of delegates) {
                const exists = yield app.sdb.exists('Delegate', { name });
                if (!exists)
                    return `Voted delegate not exists: ${name}`;
            }
            for (const name of delegates) {
                const votes = -(sender.weight + sender.agentWeight);
                app.sdb.increase('Delegate', { votes }, { name });
                app.sdb.del('Vote', { address: senderId, delegate: name });
            }
            return null;
        });
    },
};
