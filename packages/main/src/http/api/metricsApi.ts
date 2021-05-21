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
import { register } from 'prom-client';

export default class MetricsApi implements IHttpApi {
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

    router.get('/', this.metrics);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/metrics', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url);
      this.library.logger.error(err);

      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private metrics = async (req: Request, res: Response, next: Next) => {
    const data = await register.metrics();
    res.set('Content-Type', register.contentType);

    return res.send(data);
  };
}
