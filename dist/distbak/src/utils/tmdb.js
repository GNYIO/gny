"use strict";
var LOG_ADD_PATH = 1;
var LOG_SET_VALUE = 2;
var Tmdb = (function () {
    function Tmdb(map) {
        this.map = (map instanceof Map ? map : new Map());
        this.log = [];
    }
    Tmdb.prototype.set = function (keys, value) {
        var parent = this.map;
        var path = [];
        for (var i = 0; i < keys.length - 1; ++i) {
            var k = keys[i];
            var m = parent.get(k);
            path.push(k);
            if (!m) {
                m = new Map();
                this.log.push([path, LOG_ADD_PATH]);
                parent.set(k, m);
            }
            parent = m;
        }
        var lastKey = keys[keys.length - 1];
        this.log.push([keys, LOG_SET_VALUE, parent.get(lastKey)]);
        parent.set(lastKey, value);
    };
    Tmdb.prototype.get = function (keys) {
        var m = this.map;
        for (var i = 0; i < keys.length; ++i) {
            m = m.get(keys[i]);
            if (!m) {
                return null;
            }
        }
        return m;
    };
    Tmdb.prototype.remove = function (keys) {
        var m = this.map;
        for (var i = 0; i < keys.length - 1; ++i) {
            m = m.get(keys[i]);
            if (!m) {
                return;
            }
        }
        m.delete(keys[keys.length - 1]);
    };
    Tmdb.prototype.set_ = function (keys, value) {
        var m = this.map;
        for (var i = 0; i < keys.length - 1; ++i) {
            m = m.get(keys[i]);
            if (!m) {
                return;
            }
        }
        var lastKey = keys[keys.length - 1];
        if (value === undefined) {
            m.delete(lastKey);
        }
        else {
            m.set(lastKey, value);
        }
    };
    Tmdb.prototype.rollback = function () {
        while (this.log.length !== 0) {
            var _a = this.log.pop(), keys = _a[0], type = _a[1], value = _a[2];
            switch (type) {
                case 1:
                    this.remove(keys);
                    break;
                case 2:
                    this.set(keys, value);
                    break;
                default:
                    throw new Error('unknow log type');
            }
        }
    };
    Tmdb.prototype.commit = function () {
        this.log = [];
    };
    return Tmdb;
}());
module.exports = Tmdb;
