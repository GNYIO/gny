import { Request, Response, Router } from 'express';
import {
  IScope,
  Next,
  IHttpApi,
  ApiResult,
  DatMakerWrapper,
  DatWrapper,
  SingleDatWrapper,
  SingleDatMakerWrapper,
} from '@gny/interfaces';
import { StateHelper } from '../../core/StateHelper.js';
import { joi } from '@gny/extended-joi';

import { DatMaker } from '@gny/database-postgres';
import { Dat } from '@gny/database-postgres';

import { datMakerRegex, datNameRegex, datHashRegex } from '@gny/utils';

export default class DatApi implements IHttpApi {
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

    router.get('/makers', this.getDatMakers);
    router.get('/makers/:maker', this.getMakerByName);
    router.get('/', this.getDats);
    router.get('/getDat', this.getDat);

    // Configuration
    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/dat', router);
    this.library.network.app.use(
      (err: string, req: Request, res: Response, next: Next) => {
        if (!err) return next();
        const span = this.library.tracer.startSpan('datApi');
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

  private getDatMakers = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    const schema = joi
      .object()
      .keys({
        limit: joi
          .number()
          .integer()
          .min(0)
          .max(100)
          .optional(),
        offset: joi
          .number()
          .integer()
          .min(0)
          .optional(),
        address: joi
          .string()
          .address()
          .optional(),
      })
      .required();

    const report = joi.validate(query, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/dat/makers',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const limit = query.limit || 100;
    const offset = query.offset || 0;

    const condition =
      query.address !== undefined ? { address: query.address } : {};

    const count = await global.app.sdb.count<DatMaker>(DatMaker, condition);

    const datMakers = await global.app.sdb.findAll<DatMaker>(DatMaker, {
      condition,
      limit,
      offset,
    });

    const result: ApiResult<DatMakerWrapper> = {
      success: true,
      count: count,
      makers: datMakers,
    };
    return res.json(result);
  };

  private getMakerByName = async (req: Request, res: Response, next: Next) => {
    const schema = joi
      .object()
      .keys({
        maker: joi
          .string()
          .regex(datMakerRegex)
          .required(),
      })
      .required();

    const report = joi.validate(req.params, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/dat/dat/:hash',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const maker = await global.app.sdb.findOne<DatMaker>(DatMaker, {
      condition: {
        name: req.params.maker,
      },
    });

    if (maker === undefined) {
      return next('maker could not be found');
    }

    const result: ApiResult<SingleDatMakerWrapper> = {
      success: true,
      maker: maker,
    };
    return res.json(result);
  };

  private getDats = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    const schema = joi
      .object()
      .keys({
        maker: joi
          .string()
          .regex(datMakerRegex)
          .optional(),
        ownerAddress: joi
          .string()
          .address()
          .optional(),
        limit: joi
          .number()
          .integer()
          .min(0)
          .max(100)
          .optional(),
        offset: joi
          .number()
          .integer()
          .min(0)
          .optional(),
      })
      .oxor('maker', 'ownerAddress') // either maker or ownerAddress
      .required();

    const report = joi.validate(query, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/dat/dat',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const limit = query.limit || 100;
    const offset = query.offset || 0;

    // condition can never have both "maker" and "ownerAddress" because
    // with .oxor() only can be present
    const condition = {};

    if (typeof query.maker === 'string') {
      condition.datMakerId = query.maker;
    }
    if (typeof query.ownerAddress === 'string') {
      condition.ownerAddress = query.ownerAddress;
    }

    const count = await global.app.sdb.count<Dat>(Dat, condition);
    const dats = await global.app.sdb.findAll<Dat>(Dat, {
      condition,
      limit,
      offset,
      sort: { timestamp: 1 },
    });

    const result: ApiResult<DatWrapper> = {
      success: true,
      count,
      dats: dats,
    };
    return res.json(result);
  };

  private getDat = async (req: Request, res: Response, next: Next) => {
    const hashOrName = joi
      .object()
      .keys({
        hash: joi.string().regex(datHashRegex),
        name: joi.string().regex(datNameRegex),
      })
      .xor('hash', 'name')
      .required();

    const report = joi.validate(req.query, hashOrName);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/dat/getDat',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const condition =
      typeof req.query.hash === 'string'
        ? { hash: req.query.hash }
        : { name: req.query.name };

    const dat = await global.app.sdb.findOne<Dat>(Dat, {
      condition,
    });

    if (dat === undefined) {
      return next('dat can not be found');
    }

    const result: ApiResult<SingleDatWrapper> = {
      success: true,
      dat: dat,
    };
    return res.json(result);
  };
}
