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
  PulicKeyWapper,
} from '@gny/interfaces';
import { TransactionBase } from '@gny/base';
import { StateHelper } from '../../../src/core/StateHelper';
import Transactions from '../../../src/core/transactions';
import { joi } from '@gny/extendedJoi';
import { generateAddressByPublicKey, getAccount } from '../util';
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
          this.library.logger.error(req.url, err.toString());
          return res
            .status(500)
            .json({ success: false, error: err.toString() });
        }
      );
    }
  };

  private addTransactionUnsigned = (
    req: Request,
    res: Response,
    next: Next
  ) => {
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
        .positiveOrZeroBigInt()
        .required(),
      type: joi
        .number()
        .min(0)
        .required(),
      args: joi.array().optional(),
      message: joi
        .string()
        .max(256)
        .alphanum()
        .allow('')
        .optional(),
    });
    const report = joi.validate(query, unsigendTransactionSchema);
    if (report.error) {
      this.library.logger.warn(
        'Failed to validate query params',
        report.error.message
      );
      return setImmediate(next, 'Invalid transaction body');
    }

    const finishSequence = (err: string, result: any) => {
      if (err) {
        return next(err);
      }
      res.json(result);
    };

    this.library.sequence.add(
      callback => {
        (async () => {
          const state = StateHelper.getState();

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
            const unconfirmedTrs = TransactionBase.create({
              fee: query.fee,
              type: query.type,
              args: query.args || null,
              message: query.message || null,
              secondKeypair,
              keypair,
            });
            await Transactions.processUnconfirmedTransactionAsync(
              state,
              unconfirmedTrs
            );
            this.library.bus.message(
              'onUnconfirmedTransaction',
              unconfirmedTrs
            );
            const result: ApiResult<TransactionIdWrapper> = {
              success: true,
              transactionId: unconfirmedTrs.id,
            };
            callback(null, result);
          } catch (e) {
            this.library.logger.warn(
              'Failed to process unsigned transaction',
              e
            );
            callback('Server Error');
          }
        })();
      },
      undefined,
      finishSequence
    );
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
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const result1 = await this.openAccountWithSecret(body.secret);
    if (typeof result1 === 'string') {
      return next(result1);
    }
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

      const result: ApiResult<PulicKeyWapper, ServerError> = {
        success: true,
        publicKey,
      };
      return res.json(result);
    } catch (err) {
      return next('Server error');
    }
  };
}
