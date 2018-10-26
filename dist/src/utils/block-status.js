"use strict";
const constants = require("./constants");
const slots = require("./slots");
function BlockStatus() {
    const milestones = [
        198190000,
        71350000,
        23780000,
        1,
    ];
    const firstStage = 3 * 365 * 24 * 60 * 60;
    const secondStage = 5 * 365 * 24 * 60 * 60;
    const thirdStage = 5 * 365 * 24 * 60 * 60;
    const interval = slots.interval;
    let rewardOffset = 1;
    if (global.Config.netVersion === 'mainnet') {
        rewardOffset = 30 * 24 * 60 * 60 / Number.parseInt(interval, 10);
    }
    function parseHeight(height) {
        const h = Number.parseInt(height, 10);
        if (Number.isNaN(h)) {
            throw new Error('Invalid block height');
        }
        else {
            return Math.abs(h);
        }
    }
    this.calcMilestone = (height) => {
        let location;
        const ht = parseHeight(height - rewardOffset);
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
    this.calcReward = (height) => {
        const h = parseHeight(height);
        if (h < rewardOffset || h <= 0) {
            return 0;
        }
        return milestones[this.calcMilestone(height)];
    };
    this.calcSupply = (h) => {
        const height = parseHeight(h) - rewardOffset + 1;
        let supply = constants.totalAmount;
        const rewards = [];
        if (height <= 0) {
            return supply;
        }
        let amount = 0;
        let multiplier = 0;
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
            const reward = rewards[i];
            supply += reward[0] * reward[1];
        }
        return supply;
    };
}
module.exports = BlockStatus;
