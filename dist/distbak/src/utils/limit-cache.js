"use strict";
var DEFAULT_LIMIT = 10000;
var LimitCache = (function () {
    function LimitCache(opt) {
        var options = opt || {};
        this.limit = options.limit || DEFAULT_LIMIT;
        this.index = [];
        this.cache = new Map();
    }
    LimitCache.prototype.set = function (key, value) {
        if (this.cache.size >= this.limit && !this.cache.has(key)) {
            var dropKey = this.index.shift();
            this.cache.delete(dropKey);
        }
        this.cache.set(key, value);
        this.index.push(key);
    };
    LimitCache.prototype.has = function (key) {
        return this.cache.has(key);
    };
    return LimitCache;
}());
module.exports = LimitCache;
