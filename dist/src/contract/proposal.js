"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const VALID_TOPICS = [
    'asset_issue',
];
function validateAssetIssue(content) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!content || content.currency === undefined || content.amount === undefined)
            throw new Error('Invalid proposal content');
        if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(content.currency))
            throw new Error('Invalid currency');
        app.validate('amount', String(content.amount));
    });
}
module.exports = {
    propose(title, desc, topic, content, endHeight) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!/^[A-Za-z0-9_\-+!@$% ]{10,100}$/.test(title))
                return 'Invalid proposal title';
            if (desc.length > 4096)
                return 'Invalid proposal description';
            if (VALID_TOPICS.indexOf(topic) === -1)
                return 'Invalid proposal topic';
            if (!Number.isInteger(endHeight) || endHeight < 0)
                return 'EndHeight should be positive integer';
            if (endHeight < this.block.height + 5760)
                return 'Invalid proposal finish date';
            if (topic === 'asset_issue') {
                yield validateAssetIssue(content, this);
            }
            app.sdb.create('Proposal', {
                tid: this.trs.id,
                timestamp: this.trs.timestamp,
                title,
                desc,
                topic,
                content: JSON.stringify(content),
                activated: 0,
                height: this.block.height,
                endHeight,
                senderId: this.sender.address,
            });
            return null;
        });
    },
    vote(pid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!app.isCurrentBookkeeper(this.sender.address))
                return 'Permission denied';
            const proposal = yield app.sdb.findOne('Proposal', { condition: { tid: pid } });
            if (!proposal)
                return 'Proposal not found';
            if (this.block.height - proposal.height > 5760 * 30)
                return 'Proposal expired';
            const exists = yield app.sdb.exists('ProposalVote', { voter: this.sender.address, pid });
            if (exists)
                return 'Already voted';
            app.sdb.create('ProposalVote', {
                tid: this.trs.id,
                pid,
                voter: this.sender.address,
            });
            return null;
        });
    },
};
