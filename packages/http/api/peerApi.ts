import * as express from 'express';
import { Request, Response } from 'express';
import { Modules, IScope, Next } from '../../../src/interfaces';

export default class PeerApi {
  private modules: Modules;
  private library: IScope;
  private loaded = false;
  constructor(modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  // Events
  public onBlockchainReady = () => {
    this.loaded = true;
  };

  private attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (this.modules && this.loaded === true) return next();
      return res
        .status(500)
        .send({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/', this.getPeers);
    router.get('/version', this.version);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/peers', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private getPeers = (req: Request, res: Response, next: Next) => {
    this.modules.peer.findSeenNodesInDb((err, nodes) => {
      let peers = [];
      if (err) {
        this.library.logger.error('Failed to find nodes in db', err);
      } else {
        peers = nodes;
      }
      res.json({ count: peers.length, peers });
    });
  };

  private version = (req: Request, res: Response, next: Next) => {
    return res.json({
      version: this.library.config.version,
      build: this.library.config.buildVersion,
      net: this.library.config.netVersion,
    });
  };
}
