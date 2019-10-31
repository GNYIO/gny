import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import * as express from 'express';
import { Request, Response } from 'express';
import {
  IScope,
  KeyPair,
  Next,
  ITransaction,
  IBlock,
  IHttpApi,
  UnconfirmedTransaction,
} from '@gny/interfaces';
import { TransactionBase } from '@gny/base';
import { StateHelper } from '../../../src/core/StateHelper';
import Transactions from '../../../src/core/transactions';
import { Transaction } from '@gny/database-postgres';
import { joi } from '@gny/extendedJoi';

export default class TransactionsApi implements IHttpApi {
  private library: IScope;
  constructor(scope: IScope) {
    this.library = scope;

    this.attachApi();
  }

  public attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (StateHelper.BlockchainReady()) return next();
      return res
        .status(500)
        .json({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/', this.getTransactions);
    router.get('/unconfirmed/get', this.getUnconfirmedTransaction);
    router.get('/unconfirmed', this.getUnconfirmedTransactions);
    router.put('/', this.addTransactionUnsigned);
    router.put('/batch', this.addTransactions);

    router.use((req: Request, res: Response) => {
      res.status(500).json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/transactions', router);
    this.library.network.app.use(
      (err: string, req: Request, res: Response, next: Next) => {
        if (!err) return next();
        this.library.logger.error(req.url, err.toString());
        return res.status(500).json({ success: false, error: err.toString() });
      }
    );
  };

  private getTransactions = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const schema = joi.object().keys({
      limit: joi
        .number()
        .min(0)
        .max(100),
      offset: joi.number().min(0),
      id: joi
        .string()
        .min(1)
        .max(100),
      senderId: joi.string().address(),
      senderPublicKey: joi.string().publicKey(),
      blockId: joi
        .string()
        .min(1)
        .max(100)
        .when('height', {
          is: joi.exist(),
          then: joi.forbidden(),
        }),
      type: joi
        .number()
        .min(0)
        .max(1000),
      height: [joi.number().min(0), joi.string().positiveOrZeroBigInt()],
      message: joi
        .string()
        .max(256)
        .alphanum()
        .allow('')
        .optional(),
    });

    const report = joi.validate(query, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const condition = {} as Pick<
      ITransaction,
      'senderId' | 'height' | 'senderPublicKey' | 'type' | 'id' | 'message'
    >;
    if (query.senderId) {
      condition.senderId = query.senderId;
    }
    if (query.senderPublicKey) {
      condition.senderPublicKey = query.senderPublicKey;
    }
    if (query.type !== undefined) {
      condition.type = query.type;
    }
    if (query.id) {
      condition.id = query.id;
    }
    if (query.message) {
      condition.message = query.message;
    }
    if (query.height) {
      condition.height = query.height;
    }

    try {
      let block: IBlock;
      if (query.blockId) {
        block = await global.app.sdb.getBlockById(query.blockId);
        if (block === undefined) {
          return res.json({ transactions: [], count: 0 });
        }
        condition.height = block.height;
      }
      const count = await global.app.sdb.count<Transaction>(
        Transaction,
        condition
      );
      let transactions = await global.app.sdb.findAll<Transaction>(
        Transaction,
        {
          condition,
          limit: (query.limit as number) || 100,
          offset: (query.offset as number) || 0,
        }
      );
      if (!transactions) transactions = [];
      return res.json({ transactions, count });
    } catch (e) {
      global.app.logger.error('Failed to get transactions', e);
      return next(`System error: ${e}`);
    }
  };

  private getUnconfirmedTransaction = (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;
    const typeSchema = joi.object().keys({
      id: joi
        .string()
        .hex()
        .required(),
    });
    const report = joi.validate(query, typeSchema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const unconfirmedTransaction = StateHelper.GetUnconfirmedTransaction(
      query.id
    );

    return !unconfirmedTransaction
      ? next('Transaction not found')
      : res.json({ transaction: unconfirmedTransaction });
  };

  private getUnconfirmedTransactions = (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;
    const publicKeyAddress = joi.object().keys({
      senderPublicKey: joi.string().publicKey(),
      address: joi.string().address(),
    });
    const report = joi.validate(query, publicKeyAddress);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const transactions = StateHelper.GetUnconfirmedTransactionList();
    const toSend: Array<UnconfirmedTransaction | ITransaction> = [];

    if (query.senderPublicKey || query.address) {
      for (let i = 0; i < transactions.length; i++) {
        if (
          transactions[i].senderPublicKey === query.senderPublicKey ||
          transactions[i].senderId === query.address
        ) {
          toSend.push(transactions[i]);
        }
      }
    } else {
      transactions.forEach(t => toSend.push(t));
    }

    return res.json({ transactions: toSend });
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
      senderId: joi
        .string()
        .address()
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
            callback(null, { success: true, transactionId: unconfirmedTrs.id });
          } catch (e) {
            this.library.logger.warn(
              'Failed to process unsigned transaction',
              e
            );
            callback(e.toString());
          }
        })();
      },
      undefined,
      finishSequence
    );
  };

  private addTransactions = (req: Request, res: Response, next: Next) => {
    if (!req.body || !req.body.transactions) {
      return next('Invalid params');
    }
    const finishedCallback = (err: string, result: any) => {
      if (err) {
        return next(err);
      }
      return res.json({ success: true, transactions: result });
    };

    const trs = req.body.transactions;
    try {
      for (let i = 0; i < trs.length; ++i) {
        trs[i] = TransactionBase.normalizeTransaction(trs[i]);
      }
    } catch (e) {
      return next(`Invalid transaction body: ${e.toString()}`);
    }
    return this.library.sequence.add(
      callback => {
        const state = StateHelper.getState();
        Transactions.processUnconfirmedTransactions(state, trs, callback);
      },
      undefined,
      finishedCallback
    );
  };
}
