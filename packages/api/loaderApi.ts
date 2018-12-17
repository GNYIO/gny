import * as express from 'express';
import { IScope, Modules } from '../../src/interfaces';

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
    this.isLoaded = true
  }

  public status = (req, cb) => {
    cb(null, {
      loaded: this.isLoaded,
      now: this.modules.loader.loadingLastBlock.height,
      blocksCount: this.modules.loader.total,
    })
  }


  public sync = (req, cb) => {
    cb(null, {
      syncing: this.modules.loader.syncing(),
      blocks: this.modules.loader.blocksToSync,
      height: this.modules.blocks.getLastBlock().height,
    })
  }

  private attachApi = () => {
    const router = express.Router();

    router.get('/status', this.status);
    router.get('/status/sync', this.sync);
  
    this.library.network.app.use('/api/loader', router)
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err.toString())
      return res.status(500).send({ success: false, error: err.toString() })
    })
  }
}