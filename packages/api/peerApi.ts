import * as express from 'express';
import { Modules, IScope } from '../../src/interfaces';

export default class PeerApi {
  private modules: Modules;
  private library: IScope;
  constructor (modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  private getPeers = (req, cb) => {
    this.modules.peer.findSeenNodesInDb((err, nodes) => {
      let peers = [];
      if (err) {
        this.library.logger.error('Failed to find nodes in db', err);
      } else {
        peers = nodes;
      }
      cb(null, { count: peers.length, peers });
    });
  }

  private version = (req, cb) => {
    cb(null, {
      version: this.library.config.version,
      build: this.library.config.buildVersion,
      net: this.library.config.netVersion,
    });
  }

  private getPeer = (req, cb) => {
    cb(null, {});
  }

  private attachApi = () => {
    {
      const router = express.Router();

      router.use((req, res, next) => {
        if (this.modules) return next();
        return res.status(500).send({ success: false, error: 'Blockchain is loading' });
      });

      router.get('/', this.getPeers);
      router.get('/version', this.version);
      router.get('/get', this.getPeer);
      // router.map(this.shared, {
      //   'get /': 'getPeers',
      //   'get /version': 'version',
      //   'get /get': 'getPeer',
      // })

      router.use((req, res) => {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
      });

      this.library.network.app.use('/api/peers', router);
      this.library.network.app.use((err, req, res, next) => {
        if (!err) return next();
        this.library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
      });
    }
  }
}