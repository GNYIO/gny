import { Request, Response, Router } from 'express';
import {
  IScope,
  Next,
  IHttpApi,
  ApiResult,
  NftMakerWrapper,
  NftWrapper,
  SingleNftWrapper,
  SingleNftMakerWrapper,
} from '@gny/interfaces';
import { StateHelper } from '../../core/StateHelper.js';
import { joi } from '@gny/extended-joi';

import { NftMaker } from '@gny/database-postgres';
import { Nft } from '@gny/database-postgres';

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
    router.get('/makers/:maker', this.getMakerByName);
    router.get('/nft', this.getNfts);
    router.get('/nft/:hash', this.getNftByHash);

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

    const schema = joi
      .object()
      .keys({
        limit: joi
          .number()
          .integer()
          .min(0)
          .max(100),
        offset: joi
          .number()
          .integer()
          .min(0),
      })
      .required();

    const report = joi.validate(query, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/nft/makers',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const limit = query.limit || 100;
    const offset = query.offset || 0;

    const nftMakers = await global.app.sdb.findAll<NftMaker>(NftMaker, {
      condition: {},
      limit,
      offset,
    });

    const result: ApiResult<NftMakerWrapper> = {
      success: true,
      makers: nftMakers,
    };
    return res.json(result);
  };

  private getMakerByName = async (req: Request, res: Response, next: Next) => {
    const schema = joi
      .object()
      .keys({
        maker: joi
          .string()
          .regex(new RegExp(/^[A-Za-z]{1,16}$/))
          .required(),
      })
      .required();

    const report = joi.validate(req.params, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/nft/nft/:hash',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const maker = await global.app.sdb.findOne<NftMaker>(NftMaker, {
      condition: {
        maker: req.params.maker,
      },
    });

    if (maker === undefined) {
      return next('maker could not be found');
    }

    const result: ApiResult<SingleNftMakerWrapper> = {
      success: true,
      maker: maker,
    };
    return res.json(result);
  };

  private getNfts = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    const schema = joi
      .object()
      .keys({
        maker: joi
          .string()
          .regex(new RegExp(/^[A-Za-z]{1,16}$/))
          .optional(),
        limit: joi
          .number()
          .integer()
          .min(0)
          .max(100),
        offset: joi
          .number()
          .integer()
          .min(0),
      })
      .required();

    const report = joi.validate(query, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/nft/nft',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const limit = query.limit || 100;
    const offset = query.limit || 0;
    const condition =
      typeof query.maker === 'string' ? { maker: query.maker } : {};

    const nft = await global.app.sdb.findAll<Nft>(Nft, {
      condition,
      limit,
      offset,
    });

    const result: ApiResult<NftWrapper> = {
      success: true,
      nft: nft,
    };
    return res.json(result);
  };

  private getNftByHash = async (req: Request, res: Response, next: Next) => {
    const schema = joi
      .object()
      .keys({
        hash: joi
          .string()
          .regex(new RegExp(/^[a-zA-Z0-9]{30,60}$/))
          .required(),
      })
      .required();

    const report = joi.validate(req.params, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/nft/nft/:hash',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const nft = await global.app.sdb.findOne<Nft>(Nft, {
      condition: {
        hash: req.params.hash,
      },
    });

    if (nft === undefined) {
      return next('nft can not be found');
    }

    const result: ApiResult<SingleNftWrapper> = {
      success: true,
      nft: nft,
    };
    return res.json(result);
  };
}
