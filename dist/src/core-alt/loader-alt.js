"use strict";
const Router = require("../utils/router");
require('colors');
class Loader {
    constructor(scope) {
        this.scope = scope;
        this.loaded = false;
        this.syncing = false;
        this.total = 0;
        this.blockToSync = 0;
        this.library = scope;
    }
    attachApi() {
        const router = new Router();
        router.map(shared, {
            'get /status': 'status',
            'get /status/sync': 'sync',
        });
        this.library.network.app.use('/api/loader', router);
        this.library.network.app.use((err, req, res, next) => {
            if (!err)
                return next();
            this.library.logger.error(req.url, err.toString());
            return res.status(500).send({
                success: false,
                error: err.toString()
            });
        });
    }
}
module.exports = Loader;
