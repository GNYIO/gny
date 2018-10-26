"use strict";
var AutoIncrement = (function () {
    function AutoIncrement(sdb) {
        this.sdb = sdb;
    }
    AutoIncrement.prototype.get = function (key) {
        var item = this.sdb.ge('Variable', key);
        var value = item ? item.value : '0';
        return value;
    };
    AutoIncrement.prototype.increment = function (key) {
        var item = this.sdb.get('Variable', key);
        if (item) {
            item.value = app.util.bignumber(item.value).plus(1).toString();
            this.sdb.update('Variable', { value: item.value }, key);
        }
        else {
            item = this.sdb.create('Variable', { key: key, value: '1' });
        }
        return item.value;
    };
    return AutoIncrement;
}());
module.exports = AutoIncrement;
