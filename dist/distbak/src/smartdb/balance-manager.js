"use strict";
function getCurrencyFlag(currency) {
    if (currency === 'AEC') {
        return 1;
    }
    if (currency.indexOf('.') !== -1) {
        return 2;
    }
    return 3;
}
var BalanceManager = (function () {
    function BalanceManager(sdb) {
        this.sdb = sdb;
    }
    BalanceManager.prototype.get = function (address, currency) {
        var item = this.sdb.get('Balance', { address: address, currency: currency });
        var balance = item ? item.balance : '0';
        return app.util.bignumber(balance);
    };
    BalanceManager.prototype.increase = function (address, currency, amount) {
        if (app.util.bignumber(amount).eq(0))
            return;
        var key = { address: address, currency: currency };
        var item = this.sdb.get('Balance', key);
        if (item) {
            item.balance = app.util.bignumber(item.balance).plus(amount).toString(10);
            app.sdb.update('Balance', { balance: item.balance }, key);
        }
        else {
            item = this.sdb.create('Balance', {
                address: address,
                currency: currency,
                balance: amount,
                flag: getCurrencyFlag(currency),
            });
        }
    };
    BalanceManager.prototype.decrease = function (address, currency, amount) {
        this.increase(address, currency, "-" + amount);
    };
    BalanceManager.prototype.transfer = function (currency, amount, from, to) {
        this.decrease(from, currency, amount);
        this.increase(to, currency, amount);
    };
    return BalanceManager;
}());
module.exports = BalanceManager;
