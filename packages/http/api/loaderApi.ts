import * as express from 'express';
import { Request, Response } from 'express';
import { IScope, Next } from '../../../src/interfaces';
import { BlocksHelper } from '../../../src/core/BlocksHelper';
import { StateHelper } from '../../../src/core/StateHelper';

export default class LoaderApi {
  private library: IScope;

  constructor(library: IScope) {
    this.library = library;

    this.attachApi();
  }

  private attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (StateHelper.BlockchainReady()) return next();
      return res
        .status(500)
        .send({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/status', this.status);
    router.get('/status/sync', this.sync);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/loader', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private status = (req: Request, res: Response, next: Next) => {
    const loaded = StateHelper.BlockchainReady(); // TODO: wrap in try/catch
    return res.json({
      loaded,
    });
  };

  private sync = (req: Request, res: Response, next: Next) => {
    const lastBlock = BlocksHelper.getState().lastBlock;
    const syncing = StateHelper.IsSyncing();
    const blocksToSync = StateHelper.GetBlocksToSync();
    return res.json({
      syncing: syncing,
      blocks: blocksToSync,
      height: lastBlock.height,
    });
  };
}
