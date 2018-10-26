"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function loopAsyncFunction(asyncFunc, interval) {
    setImmediate(function next() {
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield asyncFunc();
            }
            catch (e) {
                library.logger.error(`Failed to run ${asyncFunc.name}`, e);
            }
            setTimeout(next, interval);
        }))();
    });
}
function loop(func, interval) {
    setImmediate(function next() {
        func((err) => {
            library.logger.error(`Failed to run ${func.name}`, err);
            setTimeout(next, interval);
        });
    });
}
function retryAsync(worker, times, interval, errorHandler) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < times; i++) {
            try {
                return yield worker();
            }
            catch (e) {
                if (i === times - 1) {
                    throw e;
                }
                if (errorHandler) {
                    errorHandler(e);
                }
                yield sleep(interval);
            }
        }
        return null;
    });
}
module.exports = {
    sleep,
    loopAsyncFunction,
    loop,
    retryAsync,
};
