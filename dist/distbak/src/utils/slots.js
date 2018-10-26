"use strict";
var constants = require('./constants.js');
function beginEpochTime() {
    return new Date(Date.UTC(2016, 5, 27, 20, 0, 0, 0));
}
function getEpochTime(time) {
    var t = time;
    if (t === undefined) {
        t = (new Date()).getTime();
    }
    var t0 = beginEpochTime().getTime();
    return Math.floor((t - t0) / 1000);
}
module.exports = {
    interval: constants.interval,
    delegates: 101,
    getTime: function (time) {
        return getEpochTime(time);
    },
    getRealTime: function (epochTime) {
        var et = epochTime;
        if (et === undefined) {
            et = this.getTime();
        }
        var d = beginEpochTime();
        var t = Math.floor(d.getTime() / 1000) * 1000;
        return t + (et * 1000);
    },
    getSlotNumber: function (epochTime) {
        var et = epochTime;
        if (et === undefined) {
            et = this.getTime();
        }
        return Math.floor(et / this.interval);
    },
    getSlotTime: function (slot) {
        return slot * this.interval;
    },
    getNextSlot: function () {
        return this.getSlotNumber() + 1;
    },
    getLastSlot: function (nextSlot) {
        return nextSlot + this.delegates;
    },
    roundTime: function (date) {
        return Math.floor(date.getTime() / 1000) * 1000;
    },
};
