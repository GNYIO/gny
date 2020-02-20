import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import * as express from 'express';
import { Request, Response } from 'express';
import {
  IScope,
  Next,
  ITransaction,
  IBlock,
  IHttpApi,
  UnconfirmedTransaction,
  ApiResult,
  TransactionsWrapper,
  UnconfirmedTransactionWrapper,
} from '@gny/interfaces';
import { TransactionBase } from '@gny/base';
import { StateHelper } from '../../../src/core/StateHelper';
import { Transaction } from '@gny/database-postgres';
import Transactions from '../../../src/core/transactions';
import { joi } from '@gny/extended-joi';

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
      message: joi.transactionMessage(),
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
      let result: ApiResult<TransactionsWrapper>;
      if (query.blockId) {
        block = await global.app.sdb.getBlockById(query.blockId);
        if (block === undefined) {
          result = {
            success: true,
            count: 0,
            transactions: [] as ITransaction[],
          };
          return res.json(result);
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
      result = {
        success: true,
        count: count,
        transactions: transactions as ITransaction[],
      };
      return res.json(result);
    } catch (e) {
      global.app.logger.error('Failed to get transactions', e);
      return next('Server Error');
    }
  };

  private getUnconfirmedTransaction = (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;
    const typeSchema = joi
      .object()
      .keys({
        id: joi
          .string()
          .hex()
          .required(),
      })
      .required();
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
    const result: ApiResult<UnconfirmedTransactionWrapper> = {
      success: true,
      transaction: unconfirmedTransaction,
    };
    return !unconfirmedTransaction
      ? next('Transaction not found')
      : res.json(result);
  };

  private getUnconfirmedTransactions = (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;
    const publicKeyAddress = joi.object().keys({
      senderPublicKey: joi
        .string()
        .publicKey()
        .optional(),
      address: joi
        .string()
        .address()
        .optional(),
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

    const result: ApiResult<TransactionsWrapper> = {
      success: true,
      transactions: toSend,
    };
    return res.json(result);
  };

  private addTransactions = (req: Request, res: Response, next: Next) => {
    if (!req.body || !req.body.transactions) {
      return next('Invalid params');
    }
    const finishedCallback = (err: string, result: any) => {
      if (err) {
        return next(err);
      }
      const trsResult: ApiResult<TransactionsWrapper> = {
        success: true,
        transactions: result,
      };
      return res.json(trsResult);
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
