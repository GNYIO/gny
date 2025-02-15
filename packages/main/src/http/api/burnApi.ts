import * as express from 'express';
import { Request, Response } from 'express';
import { IScope, Next, IHttpApi, IBurn } from '@gnyio/interfaces';
import * as StateHelper from '../../core/StateHelper.js';
import { joi } from '@gnyio/extended-joi';
import { Burn } from '@gnyio/database-postgres';
import { container, TYPES } from '@gnyio/container';
import { IProm } from '../../globalInterfaces.js';

export default class Burnapi implements IHttpApi {
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

    router.get('/', this.burn);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/burn', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url);
      this.library.logger.error(err);

      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private burn = async (req: Request, res: Response, next: Next) => {
    const prom = container.get<IProm>(TYPES.PrometheusService);

    prom.requests.inc({
      method: 'GET',
      endpoint: '/api/burn',
      statusCode: '200',
    });

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
        senderId: joi
          .string()
          .address()
          .optional(),
      })
      .required();

    const report = schema.validate(query);
    if (report.error) {
      prom.requests.inc({
        method: 'GET',
        endpoint: '/api/blocks',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const offset = query.offset ? Number(query.offset) : 0;
    const limit = query.limit ? Number(query.limit) : 100;

    let condition = {};
    if (typeof query.senderId === 'string') {
      condition = {
        senderId: query.senderId,
      };
    }

    const count = await global.app.sdb.count<Burn>(Burn, condition);

    const burn = await global.app.sdb.findAll<Burn>(Burn, {
      condition,
      offset,
      limit,
    });

    return res.json({
      success: true,
      count,
      burn,
    });
  };
}
