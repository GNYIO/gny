import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import * as express from 'express';
import { Request, Response } from 'express';
import {
  IScope,
  KeyPair,
  Next,
  IHttpApi,
  ApiResult,
  TransactionIdWrapper,
  AccountOpenModel,
  GetAccountError,
  AccountGenerateModel,
  ServerError,
  PublicKeyWrapper,
} from '@gny/interfaces';
import { TransactionBase } from '@gny/base';
import { StateHelper } from '../../core/StateHelper.js';
import Transactions from '../../core/transactions.js';
import { joi } from '@gny/extended-joi';
import { generateAddressByPublicKey, getAccount } from '../util.js';
import * as bip39 from 'bip39';

export default class ExchangeApi implements IHttpApi {
  private library: IScope;
  constructor(scope: IScope) {
    this.library = scope;

    this.attachApi();
  }

  public attachApi = () => {
    const router = express.Router();

    if (Boolean(process.env['EXCHANGE_API']) === true) {
      router.use((req: Request, res: Response, next) => {
        if (StateHelper.BlockchainReady()) return next();
        return res
          .status(500)
          .json({ success: false, error: 'Blockchain is loading' });
      });

      router.put('/', this.addTransactionUnsigned);
      router.post('/openAccount', this.openAccount);
      router.post('/generateAccount', this.generateAccount);
      router.post('/generatePublicKey', this.generatePublicKey);

      router.use((req: Request, res: Response) => {
        res
          .status(500)
          .json({ success: false, error: 'API endpoint not found' });
      });

      this.library.network.app.use('/api/exchange', router);
      this.library.network.app.use(
        (err: string, req: Request, res: Response, next: Next) => {
          if (!err) return next();
          this.library.logger.error(req.url);
          this.library.logger.error(err);

          return res
            .status(500)
            .json({ success: false, error: err.toString() });
        }
      );
    }
  };

  private addTransactionUnsigned = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const span = global.library.tracer.startSpan(
      'received unsigned transaction'
    );

    const query = req.body;
    const unsigendTransactionSchema = joi.object().keys({
      secret: joi
        .string()
        .secret()
        .required(),
      secondSecret: joi
        .string()
        .secret()
        .optional(),
      fee: joi
        .string()
        .fee(query && query.type >= 0 ? query.type : -1)
        .required(),
      type: joi
        .number()
        .integer()
        .min(0)
        .required(),
      args: joi.array().optional(),
      message: joi.transactionMessage(),
    });
    const report = joi.validate(query, unsigendTransactionSchema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'PUT',
        endpoint: '/api/exchange',
        statusCode: '500',
      });

      this.library.logger.warn(
        `Failed to validate query params: ${report.error.message}`
      );

      span.setTag('error', true);
      span.log({
        value: `Failed to validate query params: ${report.error.message}`,
      });
      span.log({
        value: 'Invalid transaction body',
      });
      span.finish();

      return setImmediate(next, 'Invalid transaction body');
    }

    let unconfirmedTrs = null;
    try {
      const hash = crypto
        .createHash('sha256')
        .update(query.secret, 'utf8')
        .digest();
      const keypair = ed.generateKeyPair(hash);
      let secondKeypair: KeyPair = null;
      if (query.secondSecret) {
        secondKeypair = ed.generateKeyPair(
          crypto
            .createHash('sha256')
            .update(query.secondSecret, 'utf8')
            .digest()
        );
      }
      unconfirmedTrs = TransactionBase.create({
        fee: query.fee,
        type: query.type,
        args: query.args || null,
        message: query.message || null,
        secondKeypair,
        keypair,
      });
    } catch (err) {
      global.app.prom.requests.inc({
        method: 'PUT',
        endpoint: '/api/exchange',
        statusCode: '500',
      });

      span.setTag('error', true);
      span.log({
        value: '',
      });

      span.finish();
      return setImmediate(next, 'error while signing');
    }

    let result = null;
    try {
      await global.app.mutex.runExclusive(async () => {
        span.log({
          value: 'start sequence',
        });

        try {
          const state = StateHelper.getState();

          await Transactions.processUnconfirmedTransactionAsync(
            state,
            unconfirmedTrs,
            span
          );

          this.library.bus.message(
            'onUnconfirmedTransaction',
            unconfirmedTrs,
            span
          );

          const temp: ApiResult<TransactionIdWrapper> = {
            success: true,
            transactionId: unconfirmedTrs.id,
          };

          result = temp;
        } catch (e) {
          this.library.logger.warn('Failed to process unsigned transaction');
          this.library.logger.warn(e);
          throw new Error('Server Error');
        }
      });
    } catch (err) {
      global.app.prom.requests.inc({
        method: 'PUT',
        endpoint: '/api/exchange',
        statusCode: '500',
      });

      span.setTag('error', true);
      span.log({
        value: `unconfirmed transaction error: ${err}`,
      });

      span.finish();
      return next(err);
    }

    span.log({
      result,
    });
    span.finish();

    global.app.prom.requests.inc({
      method: 'PUT',
      endpoint: '/api/exchange',
      statusCode: '200',
    });

    return res.json(result);
  };

  private openAccount = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const secret = joi
      .object()
      .keys({
        secret: joi
          .string()
          .secret()
          .required(),
      })
      .required();
    const report = joi.validate(body, secret);

    if (report.error) {
      global.app.prom.requests.inc({
        method: 'POST',
        endpoint: '/api/exchange/openAccount',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const result1 = await this.openAccountWithSecret(body.secret);
    if (typeof result1 === 'string') {
      global.app.prom.requests.inc({
        method: 'POST',
        endpoint: '/api/exchange/openAccount',
        statusCode: '500',
      });

      return next(result1);
    }

    global.app.prom.requests.inc({
      method: 'POST',
      endpoint: '/api/exchange/openAccount',
      statusCode: '200',
    });

    const result: ApiResult<AccountOpenModel, GetAccountError> = {
      success: true,
      ...result1,
    };
    return res.json(result);
  };

  // helper functions
  private openAccountWithSecret = async (passphrase: string) => {
    const hash = crypto
      .createHash('sha256')
      .update(passphrase, 'utf8')
      .digest();
    const keyPair = ed.generateKeyPair(hash);
    const publicKey = keyPair.publicKey.toString('hex');
    const address = generateAddressByPublicKey(publicKey);

    const accountInfoOrError = await getAccount(address);
    if (typeof accountInfoOrError === 'string') {
      return accountInfoOrError;
    }

    if (
      accountInfoOrError &&
      accountInfoOrError.account &&
      !accountInfoOrError.account.publicKey
    ) {
      accountInfoOrError.account.publicKey = publicKey;
    }
    return accountInfoOrError;
  };

  private generateAccount = (req: Request, res: Response, next: Next) => {
    const secret = bip39.generateMnemonic();
    const keypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(secret, 'utf8')
        .digest()
    );
    const address = generateAddressByPublicKey(
      keypair.publicKey.toString('hex')
    );
    const result: ApiResult<AccountGenerateModel, ServerError> = {
      success: true,
      secret,
      publicKey: keypair.publicKey.toString('hex'),
      privateKey: keypair.privateKey.toString('hex'),
      address,
    };

    global.app.prom.requests.inc({
      method: 'POST',
      endpoint: '/api/exchange/generateAccount',
      statusCode: '200',
    });

    return res.json(result);
  };

  private generatePublicKey = (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const hasSecret = joi
      .object()
      .keys({
        secret: joi
          .string()
          .secret()
          .required(),
      })
      .required();
    const report = joi.validate(body, hasSecret);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'POST',
        endpoint: '/api/exchange/generatePublicKey',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      const kp = ed.generateKeyPair(
        crypto
          .createHash('sha256')
          .update(body.secret, 'utf8')
          .digest()
      );
      const publicKey = kp.publicKey.toString('hex');

      global.app.prom.requests.inc({
        method: 'POST',
        endpoint: '/api/exchange/generatePublicKey',
        statusCode: '200',
      });

      const result: ApiResult<PublicKeyWrapper, ServerError> = {
        success: true,
        publicKey,
      };
      return res.json(result);
    } catch (err) {
      global.app.prom.requests.inc({
        method: 'POST',
        endpoint: '/api/exchange/generatePublicKey',
        statusCode: '500',
      });

      return next('Server error');
    }
  };
}
