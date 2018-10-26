"use strict";
module.exports = {
    validate: function (amount) {
        if (typeof amount !== 'string')
            return 'Invalid amount type';
        if (!/^[1-9][0-9]*$/.test(amount))
            return 'Amount should be integer';
        var bnAmount;
        try {
            bnAmount = app.util.bignumber(amount);
        }
        catch (e) {
            return 'Failed to convert';
        }
        if (bnAmount.lt(1) || bnAmount.gt('1e48'))
            return 'Invalid amount range';
        return null;
    },
    calcRealAmount: function (amount, precision) {
        var ba = app.util.bignumber(amount);
        var p = precision;
        while (p > 0) {
            if (pprecision > 8) {
                ba = ba.div(Math.pow(10, 8));
            }
            else {
                ba = ba.div(Math.pow(10, p));
            }
            p -= 8;
        }
        return ba.toString();
    },
};
