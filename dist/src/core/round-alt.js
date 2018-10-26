"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slots = require("../utils/slots");
class Round {
    constructor(scope) {
        this.isloaded = false;
        this.feesByRound = {};
        this.rewardsByRound = {};
        this.delegatesByRound = {};
        this.unFeesByRound = {};
        this.unRewardsByRound = {};
        this.unDelegatesByRound = {};
        this.library = scope;
    }
    loaded() {
        return this.isloaded;
    }
    calc(height) {
        return Math.floor(height / slots.delegates) + (height % slots.delegates > 0 ? 1 : 0);
    }
    onBind(scope) {
        this.modules = scope;
    }
    onBlockChainReady() {
        this.isloaded = true;
    }
    onFinishRound(round) {
        this.library.network.io.sockets.emit('/round/change', { number: round });
    }
    cleanup() {
        this.isloaded = false;
    }
}
exports.Round = Round;
