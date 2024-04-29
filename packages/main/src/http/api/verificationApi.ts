import * as express from 'express';
import { Request, Response } from 'express';
import {
  IScope,
  Next,
  IHttpApi,
  VerificationsWrapper,
  SingleVerificationWrapper,
  ApiResult,
} from '@gnyio/interfaces';
import { StateHelper } from '../../core/StateHelper.js';
import { joi } from '@gnyio/extended-joi';
import { Verification } from '@gnyio/database-postgres';

export default class VerificationApi implements IHttpApi {
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

    router.get('/get', this.getVerificationByIdentifier); // single verification
    router.get('/', this.getVerifications); // multiple verifications

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/verification', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url);
      this.library.logger.error(err);

      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private getVerificationByIdentifier = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/verification/get',
      statusCode: '200',
    });

    const { query } = req;

    const schema = joi
      .object()
      .keys({
        identifier: joi.string().regex(/^[A-Z_]+$/),
      })
      .required();

    const report = schema.validate(query);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/verification/get',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const verification = await global.app.sdb.findOne<Verification>(
      Verification,
      {
        condition: {
          identifier: query.identifier,
        },
      }
    );

    if (verification === undefined) {
      return next('verification could not be found');
    }

    const result: ApiResult<SingleVerificationWrapper> = {
      success: true,
      verification,
    };

    return res.json(result);
  };

  public getVerifications = async (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/verification',
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
        endpoint: '/api/verification',
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

    const count = await global.app.sdb.count<Verification>(
      Verification,
      condition
    );

    // sort first by height and then by timestamp
    // because timestamps are not necessary in order
    // sorting first by height is more reliable
    const verifications = await global.app.sdb.findAll<Verification>(
      Verification,
      {
        condition,
        offset,
        limit,
        sort: {
          height: 1,
          timestamp: 1,
        },
      }
    );

    const result: ApiResult<VerificationsWrapper> = {
      success: true,
      count,
      verifications,
    };

    return res.json(result);
  };
}
