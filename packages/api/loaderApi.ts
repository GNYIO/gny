import * as express from 'express';
import { Request, Response } from 'express';
import { IScope, Modules, Next } from '../../src/interfaces';

export default class LoaderApi {
  private modules: Modules;
  private library: IScope;
  private isLoaded = false;

  constructor (modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  // Events
  public onBlockchainReady = () => {
    this.isLoaded = true;
  }

  private attachApi = () => {
    const router = express.Router();

    router.get('/status', this.status);
    router.get('/status/sync', this.sync);

    router.use((req: Request, res: Response) => {
      return res.status(500).json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/loader', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    });
  }

  private status = (req: Request, res: Response, next: Next) => {
    return res.json({
      loaded: this.isLoaded,
      now: this.modules.loader.loadingLastBlock.height,
      blocksCount: this.modules.loader.total,
    });
  }

  private sync = (req: Request, res: Response, next: Next) => {
    return res.json({
      syncing: this.modules.loader.syncing(),
      blocks: this.modules.loader.blocksToSync,
      height: this.modules.blocks.getLastBlock().height,
    });
  }
}