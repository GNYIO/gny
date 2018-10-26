import Router = require('../utils/router');
import sandboxHelper = require('../utils/sandbox');
import slots = require('../utils/slots');
import constants = require('../utils/constants');

require('colors')


class Loader {
  private loaded: boolean = false;
  private syncing: boolean = false;
  private loadingBlock: any;
  private genesisBlock: any;
  private total: number = 0;
  private blockToSync: number = 0;
  private syncintervalId: any;

  constructor(public scope) {
    this.library = scope;
  }

  private attachApi() {
    const router = new Router();

    router.map(shared, {
      'get /status': 'status',
      'get /status/sync': 'sync',
    });

    this.library.network.app.use('/api/loader', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({
        success: false,
        error: err.toString();
      });
    })
  }

  private

}

export = Loader;
