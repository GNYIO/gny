import * as express from 'express';
import { Request, Response } from 'express';
import {
  IScope,
  Next,
  IHttpApi,
  ApiResult,
  LoaderStatus,
  SyncStatus,
} from '@gny/interfaces';
import { StateHelper } from '../../../src/core/StateHelper';

export default class LoaderApi implements IHttpApi {
  private library: IScope;

  constructor(library: IScope) {
    this.library = library;

    this.attachApi();
  }

  public attachApi = () => {
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
      this.library.logger.error(req.url);
      this.library.logger.error(err);

      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private status = (req: Request, res: Response, next: Next) => {
    const loaded = StateHelper.BlockchainReady(); // TODO: wrap in try/catch
    const result: ApiResult<LoaderStatus> = {
      success: true,
      loaded,
    };
    return res.json(result);
  };

  private sync = (req: Request, res: Response, next: Next) => {
    const lastBlock = StateHelper.getState().lastBlock;
    const syncing = StateHelper.IsSyncing();
    const blocksToSync = StateHelper.GetBlocksToSync();
    const result: ApiResult<SyncStatus> = {
      success: true,
      syncing: syncing,
      blocks: blocksToSync,
      height: lastBlock.height,
    };
    return res.json(result);
  };
}
