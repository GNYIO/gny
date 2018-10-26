"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function () { if (t[0] & 1)
            throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return { value: op[1], done: false };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            }
            catch (e) {
                op = [6, e];
                y = 0;
            }
            finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var assert = require('assert');
var crypto = require('crypto');
var fs = require('fs');
var async = require('async');
var init = require('./src/init');
var initRuntime = require('./src/runtime');
function verifyGenesisBlock(scope, block) {
    try {
        var payloadHash = crypto.createHash('sha256');
        for (var i = 0; i < block.transactions.length; ++i) {
            var trs = block.transactions[i];
            var bytes = scope.base.transaction.getBytes(trs);
            payloadHash.update(bytes);
        }
        var id = scope.base.block.getId(block);
        assert.equal(payloadHash.digest().toString('hex'), block.payloadHash, 'Unexpected payloadHash');
        assert.equal(id, block.id, 'Unexpected block id');
    }
    catch (e) {
        throw e;
    }
}
var Application = (function () {
    function Application(options) {
        this.options = options;
    }
    Application.prototype.run = function () {
        var _this = this;
        var options = this.options;
        var pidFile = options.pidFile;
        global.featureSwitch = {};
        global.state = {};
        init(options, function (error, scope) {
            if (error) {
                scope.logger.fatal(error);
                if (fs.existsSync(pidFile)) {
                    fs.unlinkSync(pidFile);
                }
                process.exit(1);
                return;
            }
            process.once('cleanup', function () {
                scope.logger.info('Cleaning up...');
                async.eachSeries(scope.modules, function (module, cb) {
                    if (typeof (module.cleanup) === 'function') {
                        module.cleanup(cb);
                    }
                    else {
                        setImmediate(cb);
                    }
                }, function (err) {
                    if (err) {
                        scope.logger.error('Error while cleaning up', err);
                    }
                    else {
                        scope.logger.info('Cleaned up successfully');
                    }
                    (function () {
                        return __awaiter(_this, void 0, void 0, function () {
                            var e_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4, global.app.sdb.close()];
                                    case 1:
                                        _a.sent();
                                        return [3, 3];
                                    case 2:
                                        e_1 = _a.sent();
                                        scope.logger.error('failed to close sdb', e_1);
                                        return [3, 3];
                                    case 3: return [2];
                                }
                            });
                        });
                    })();
                    if (fs.existsSync(pidFile)) {
                        fs.unlinkSync(pidFile);
                    }
                    process.exit(1);
                });
            });
            process.once('SIGTERM', function () {
                process.emit('cleanup');
            });
            process.once('exit', function () {
                scope.logger.info('process exited');
            });
            process.once('SIGINT', function () {
                process.emit('cleanup');
            });
            process.on('uncaughtException', function (err) {
                scope.logger.fatal('uncaughtException', { message: err.message, stack: err.stack });
                process.emit('cleanup');
            });
            process.on('unhandledRejection', function (err) {
                scope.logger.error('unhandledRejection', err);
                process.emit('cleanup');
            });
            verifyGenesisBlock(scope, scope.genesisblock.block);
            options.library = scope;
            (function () {
                return __awaiter(_this, void 0, void 0, function () {
                    var e_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4, initRuntime(options)];
                            case 1:
                                _a.sent();
                                return [3, 3];
                            case 2:
                                e_2 = _a.sent();
                                scope.logger.error('init runtime error: ', e_2);
                                process.exit(1);
                                return [2];
                            case 3:
                                scope.bus.message('bind', scope.modules);
                                global.modules = scope.modules;
                                global.library = scope;
                                scope.logger.info('Modules ready and launched');
                                if (!scope.config.publicIp) {
                                    scope.logger.warn('Failed to get public ip, block forging MAY not work!');
                                }
                                return [2];
                        }
                    });
                });
            })();
        });
    };
    return Application;
}());
module.exports = {
    Application: Application,
};
