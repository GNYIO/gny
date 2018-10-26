"use strict";
var slots = require('../utils/slots.js');
var sandboxHelper = require('../utils/sandbox.js');
var library;
var self;
var modules;
var priv = {};
var shared = {};
priv.loaded = false;
priv.feesByRound = {};
priv.rewardsByRound = {};
priv.delegatesByRound = {};
priv.unFeesByRound = {};
priv.unRewardsByRound = {};
priv.unDelegatesByRound = {};
function Round(cb, scope) {
    library = scope;
    self = this;
    setImmediate(cb, null, self);
}
Round.prototype.loaded = function () { return priv.loaded; };
Round.prototype.calc = function (height) {
    var round = Math.floor(height / slots.delegates) + (height % slots.delegates > 0 ? 1 : 0);
    return round;
};
Round.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Round.prototype.onBind = function (scope) {
    modules = scope;
};
Round.prototype.onBlockchainReady = function () {
    priv.loaded = true;
};
Round.prototype.onFinishRound = function (round) {
    library.network.io.sockets.emit('rounds/change', { number: round });
};
Round.prototype.cleanup = function (cb) {
    priv.loaded = false;
    cb();
};
module.exports = Round;
