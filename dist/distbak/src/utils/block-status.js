"use strict";
var constants = require('./constants.js');
var slots = require('./slots.js');
function BlockStatus() {
    var _this = this;
    var milestones = [
        198190000,
        71350000,
        23780000,
        1,
    ];
    var firstStage = 3 * 365 * 24 * 60 * 60;
    var secondStage = 5 * 365 * 24 * 60 * 60;
    var thirdStage = 5 * 365 * 24 * 60 * 60;
    var interval = slots.interval;
    var rewardOffset = 1;
    if (global.Config.netVersion === 'mainnet') {
        rewardOffset = 30 * 24 * 60 * 60 / Number.parseInt(interval, 10);
    }
    function parseHeight(height) {
        var h = Number.parseInt(height, 10);
        if (Number.isNaN(h)) {
            throw new Error('Invalid block height');
        }
        else {
            return Math.abs(h);
        }
    }
    this.calcMilestone = function (height) {
        var location;
        var ht = parseHeight(height - rewardOffset);
        if (ht < firstStage) {
            location = 0;
        }
        else if (ht < (firstStage + secondStage)) {
            location = 1;
        }
        else if (ht < (firstStage + secondStage + thirdStage)) {
            location = 2;
        }
        else {
            location = 3;
        }
        return location;
    };
    this.calcReward = function (height) {
        var h = parseHeight(height);
        if (h < rewardOffset || h <= 0) {
            return 0;
        }
        return milestones[_this.calcMilestone(height)];
    };
    this.calcSupply = function (h) {
        var height = parseHeight(h) - rewardOffset + 1;
        var supply = constants.totalAmount;
        var rewards = [];
        if (height <= 0) {
            return supply;
        }
        var amount = 0;
        var multiplier = 0;
        if (height < firstStage) {
            amount = height;
            multiplier = milestones[0];
            rewards.push([amount, multiplier]);
        }
        if (height > firstStage && height < (firstStage + secondStage)) {
            amount = height - firstStage;
            multiplier = milestones[1];
            rewards.push([amount, multiplier]);
        }
        if (height > (firstStage + secondStage) && height < (firstStage + secondStage + thirdStage)) {
            amount = height - firstStage - secondStage;
            multiplier = milestones[2];
            rewards.push([amount, multiplier]);
        }
        if (height > (firstStage + secondStage + thirdStage)) {
            amount = height - firstStage - secondStage - thirdStage;
            multiplier = milestones[3];
            rewards.push([amount, multiplier]);
        }
        for (i = 0; i < rewards.length; i++) {
            var reward = rewards[i];
            supply += reward[0] * reward[1];
        }
        return supply;
    };
}
module.exports = BlockStatus;
