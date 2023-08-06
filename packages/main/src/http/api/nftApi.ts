import { Request, Response, Router } from 'express';
import {
  IScope,
  Next,
  IHttpApi,
  ApiResult,
  NftMakerWrapper,
} from '@gny/interfaces';
import { StateHelper } from '../../core/StateHelper.js';
import { NftMaker } from '@gny/database-postgres';

export default class NftApi implements IHttpApi {
  private library: IScope;

  constructor(library: IScope) {
    this.library = library;

    this.attachApi();
  }

  public attachApi = () => {
    const router = Router();

    router.use((req: Request, res: Response, next) => {
      if (StateHelper.BlockchainReady()) return next();
      return res
        .status(500)
        .send({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/makers', this.getNftMakers);

    // Configuration
    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/nft', router);
    this.library.network.app.use(
      (err: string, req: Request, res: Response, next: Next) => {
        if (!err) return next();
        const span = this.library.tracer.startSpan('nftApi');
        span.setTag('error', true);
        span.log({
          value: `${req.url} ${err}`,
        });
        span.finish();

        this.library.logger.error(req.url);
        this.library.logger.error(err);

        return res.status(500).json({
          success: false,
          error: err.toString(),
        });
      }
    );
  };

  private getNftMakers = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    const nftMakers = await global.app.sdb.findAll<NftMaker>(NftMaker, {
      condition: {},
    });

    const result: ApiResult<NftMakerWrapper> = {
      success: true,
      makers: nftMakers,
    };
    return res.json(result);
  };
}
