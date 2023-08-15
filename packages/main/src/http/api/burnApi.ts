import * as express from 'express';
import { Request, Response } from 'express';
import { IScope, Next, IHttpApi, IBurn } from '@gny/interfaces';
import { StateHelper } from '../../core/StateHelper.js';
import { joi } from '@gny/extended-joi';
import { Burn } from '@gny/database-postgres';

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
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/burn',
      statusCode: '200',
    });

    const { query } = req;

    query.offset = query.offset ? Number(query.offset) : 0;
    query.limit = query.limit ? Number(query.limit) : 100;

    // limit and offset required because already set above
    const schema = joi
      .object()
      .keys({
        limit: joi
          .number()
          .integer()
          .min(0)
          .max(100)
          .required(),
        offset: joi
          .number()
          .integer()
          .min(0)
          .required(),
        senderId: joi
          .string()
          .address()
          .optional(),
      })
      .required();

    const report = schema.validate(query);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/blocks',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const offset = query.offset;
    const limit = query.limit;
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
