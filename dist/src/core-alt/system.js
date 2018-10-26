"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const slots = require("../utils/slots");
const Router = require("../utils/router");
class System {
    constructor(scope) {
        this.osName = os.platform() + os.release();
        this.library = scope;
        this.version = scope.config.version;
        this.port = scope.config.port;
        this.magic = scope.config.magic;
    }
    getSystemInfo(req) {
        const lastBlock = modules.blocks.getLastBlock();
        return {
            os: `${os.platform()}_${os.release()}`,
            version: library.config.version,
            timestamp: Date.now(),
            lastBlock: {
                height: lastBlock.height,
                timestamp: slots.getRealTime(lastBlock.timestamp),
                behind: slots.getNextSlot() - (slots.getSlotNumber(lastBlock.timestamp) + 1),
            },
        };
    }
    getOS() {
        return this.osName;
    }
    getVersion() {
        return this.version;
    }
    getPort() {
        return this.port;
    }
    getMagic() {
        return this.magic;
    }
    onBind(scope) {
        this.modules = scope;
    }
    attachApi() {
        const router = new Router();
        router.use((req, res, next) => {
            if (modules)
                return next();
            return res.status(500).send({ success: false, error: 'Blockchain is loading' });
        });
        router.map(shared, {
            'get /': 'getSystemInfo',
        });
        router.use((req, res) => {
            res.status(500).send({ success: false, error: 'API endpoint not found' });
        });
        this.library.network.app.use('/api/system', router);
        this.library.network.app.use((err, req, res, next) => {
            if (!err)
                return next();
            this.library.logger.error(req.url, err.toString());
            return res.status(500).send({ success: false, error: err.toString() });
        });
    }
}
exports.default = System;
