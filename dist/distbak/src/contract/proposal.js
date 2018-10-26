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
var VALID_TOPICS = [
    'asset_issue',
];
function validateAssetIssue(content) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!content || content.currency === undefined || content.amount === undefined)
                throw new Error('Invalid proposal content');
            if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(content.currency))
                throw new Error('Invalid currency');
            app.validate('amount', String(content.amount));
            return [2];
        });
    });
}
module.exports = {
    propose: function (title, desc, topic, content, endHeight) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!/^[A-Za-z0-9_\-+!@$% ]{10,100}$/.test(title))
                            return [2, 'Invalid proposal title'];
                        if (desc.length > 4096)
                            return [2, 'Invalid proposal description'];
                        if (VALID_TOPICS.indexOf(topic) === -1)
                            return [2, 'Invalid proposal topic'];
                        if (!Number.isInteger(endHeight) || endHeight < 0)
                            return [2, 'EndHeight should be positive integer'];
                        if (endHeight < this.block.height + 5760)
                            return [2, 'Invalid proposal finish date'];
                        if (!(topic === 'asset_issue'))
                            return [3, 2];
                        return [4, validateAssetIssue(content, this)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        app.sdb.create('Proposal', {
                            tid: this.trs.id,
                            timestamp: this.trs.timestamp,
                            title: title,
                            desc: desc,
                            topic: topic,
                            content: JSON.stringify(content),
                            activated: 0,
                            height: this.block.height,
                            endHeight: endHeight,
                            senderId: this.sender.address,
                        });
                        return [2, null];
                }
            });
        });
    },
    vote: function (pid) {
        return __awaiter(this, void 0, void 0, function () {
            var proposal, exists;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!app.isCurrentBookkeeper(this.sender.address))
                            return [2, 'Permission denied'];
                        return [4, app.sdb.findOne('Proposal', { condition: { tid: pid } })];
                    case 1:
                        proposal = _a.sent();
                        if (!proposal)
                            return [2, 'Proposal not found'];
                        if (this.block.height - proposal.height > 5760 * 30)
                            return [2, 'Proposal expired'];
                        return [4, app.sdb.exists('ProposalVote', { voter: this.sender.address, pid: pid })];
                    case 2:
                        exists = _a.sent();
                        if (exists)
                            return [2, 'Already voted'];
                        app.sdb.create('ProposalVote', {
                            tid: this.trs.id,
                            pid: pid,
                            voter: this.sender.address,
                        });
                        return [2, null];
                }
            });
        });
    },
};
