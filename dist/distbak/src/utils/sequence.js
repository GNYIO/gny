"use strict";
var util = require('util');
var async = require('async');
var constants = require('./constants.js');
var TASK_TIMEOUT_MS = constants.interval * 1000;
function tick(task, cb) {
    var isCallbacked = false;
    var done = function (err, res) {
        if (isCallbacked) {
            return;
        }
        isCallbacked = true;
        if (task.done) {
            setImmediate(task.done, err, res);
        }
        setImmediate(cb);
    };
    setTimeout(function () {
        if (!isCallbacked) {
            done('Worker task timeout');
        }
    }, TASK_TIMEOUT_MS);
    var args = [done];
    if (task.args) {
        args = args.concat(task.args);
    }
    try {
        task.worker.apply(task.worker, args);
    }
    catch (e) {
        library.logger.error('Worker task failed:', e);
        done(e.toString());
    }
}
var Sequence = (function () {
    function Sequence(config) {
        this.counter = 1;
        this.name = config.name;
        this.queue = async.queue(tick, 1);
    }
    Sequence.prototype.add = function (worker, args, cb) {
        var done;
        if (!cb && args && typeof args === 'function') {
            done = args;
        }
        else {
            done = cb;
        }
        if (worker && typeof worker === 'function') {
            var task = { worker: worker, done: done };
            if (util.isArray(args)) {
                task.args = args;
            }
            task.counter = this.counter++;
            this.queue.push(task);
        }
    };
    Sequence.prototype.count = function () {
        return this.sequence.length;
    };
    return Sequence;
}());
module.exports = Sequence;
