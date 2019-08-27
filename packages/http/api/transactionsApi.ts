import * as crypto from 'crypto';
import * as ed from '../../../src/utils/ed';
import * as express from 'express';
import { Request, Response } from 'express';
import {
  IScope,
  KeyPair,
  Next,
  ITransaction,
  IBlock,
} from '../../../src/interfaces';
import { TransactionBase } from '../../../src/base/transaction';
import { StateHelper } from '../../../src/core/StateHelper';
import Transactions from '../../../src/core/transactions';
import { Transaction } from '../../database-postgres/entity/Transaction';

export default class TransactionsApi {
  private library: IScope;
  constructor(scope: IScope) {
    this.library = scope;

    this.attachApi();
  }

  private attachApi = () => {
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
    const schema = this.library.joi.object().keys({
      limit: this.library.joi
        .number()
        .min(0)
        .max(100),
      offset: this.library.joi.number().min(0),
      id: this.library.joi
        .string()
        .min(1)
        .max(100),
      senderId: this.library.joi.string().address(),
      senderPublicKey: this.library.joi.string().publicKey(),
      blockId: this.library.joi
        .string()
        .min(1)
        .max(100)
        .when('height', {
          is: this.library.joi.exist(),
          then: this.library.joi.forbidden(),
        }),
      type: this.library.joi
        .number()
        .min(0)
        .max(1000),
      height: [
        this.library.joi.number().min(0),
        this.library.joi.string().positiveOrZeroBigInt(),
      ],
      message: this.library.joi
        .string()
        .max(256)
        .alphanum()
        .allow('')
        .optional(),
    });

    const report = this.library.joi.validate(query, schema);
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
    const typeSchema = this.library.joi.object().keys({
      id: this.library.joi
        .string()
        .hex()
        .required(),
    });
    const report = this.library.joi.validate(query, typeSchema);
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
    const publicKeyAddress = this.library.joi.object().keys({
      senderPublicKey: this.library.joi.string().publicKey(),
      address: this.library.joi.string().address(),
    });
    const report = this.library.joi.validate(query, publicKeyAddress);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const transactions = StateHelper.GetUnconfirmedTransactionList();
    const toSend: ITransaction[] = [];

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
    const unsigendTransactionSchema = this.library.joi.object().keys({
      secret: this.library.joi
        .string()
        .secret()
        .required(),
      secondSecret: this.library.joi
        .string()
        .secret()
        .optional(),
      fee: this.library.joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      type: this.library.joi
        .number()
        .min(0)
        .required(),
      args: this.library.joi.array().optional(),
      message: this.library.joi
        .string()
        .max(256)
        .alphanum()
        .allow('')
        .optional(),
      senderId: this.library.joi
        .string()
        .address()
        .optional(),
    });
    const report = this.library.joi.validate(query, unsigendTransactionSchema);
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
            const trs = TransactionBase.create({
              fee: query.fee,
              type: query.type,
              args: query.args || null,
              message: query.message || null,
              secondKeypair,
              keypair,
            });
            await Transactions.processUnconfirmedTransactionAsync(state, trs);
            this.library.bus.message('onUnconfirmedTransaction', trs);
            callback(null, { success: true, transactionId: trs.id });
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
