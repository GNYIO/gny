"use strict";
module.exports = {
    1: function () { return 0.1; },
    2: function (trs) {
        var len = trs.args[0].length;
        if (len === 2) {
            return 200;
        }
        else if (len === 3) {
            return 100;
        }
        else if (len === 4) {
            return 80;
        }
        else if (len === 5) {
            return 40;
        }
        else if (len <= 10) {
            return 10;
        }
        return 1;
    },
    3: function () { return 5; },
    4: function () { return 0.1; },
    5: function () { return 0; },
    6: function () { return 5; },
    7: function () { return 100; },
    8: function () { return 0.1; },
    9: function () { return 0; },
    10: function () { return 100; },
    11: function () { return 0.1; },
    12: function () { return 0.1; },
    100: function () { return 100; },
    101: function () { return 500; },
    102: function () { return 0.1; },
    103: function () { return 0.1; },
    200: function () { return 100; },
    201: function () { return 1; },
    202: function () { return 1; },
    203: function () { return 1; },
    204: function () { return 0.1; },
    205: function () { return 0.1; },
    300: function () { return 10; },
    301: function () { return 0.1; },
    302: function () { return 0; },
    400: function () { return 0.1; },
    401: function () { return 100; },
    402: function () { return 0.01; },
    403: function () { return 0; },
    404: function () { return 0.01; },
    405: function () { return 0.01; },
    406: function () { return 0.01; },
    500: function () { return 0; },
    501: function () { return 0; },
    502: function () { return 1; },
    503: function () { return 1; },
};
