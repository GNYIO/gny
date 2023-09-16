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
  TransactionConfirmationWrapper,
} from '@gny/interfaces';
import { StateHelper } from '../../core/StateHelper.js';
import { Transaction } from '@gny/database-postgres';
import { joi } from '@gny/extended-joi';
import { TransactionsHelper } from '../../core/TransactionsHelper.js';
import BigNumber from 'bignumber.js';

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
    router.get('/count', this.countTransactions);
    router.get('/newestFirst', this.newestFirst);
    router.get('/unconfirmed/get', this.getUnconfirmedTransaction);
    router.get('/unconfirmed', this.getUnconfirmedTransactions);
    router.get('/confirmations', this.getTransactionConfirmations);

    router.use((req: Request, res: Response) => {
      res.status(500).json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/transactions', router);
    this.library.network.app.use(
      (err: string, req: Request, res: Response, next: Next) => {
        if (!err) return next();
        this.library.logger.error(req.url);
        this.library.logger.error(err);

        return res.status(500).json({ success: false, error: err.toString() });
      }
    );
  };

  private getTransactions = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const schema = joi.object().keys({
      limit: joi
        .number()
        .integer()
        .min(0)
        .max(100),
      offset: joi
        .number()
        .integer()
        .min(0),
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
      height: [
        joi
          .number()
          .integer()
          .min(0),
        joi.string().positiveOrZeroBigInt(),
      ],
      message: joi.transactionMessage(),
    });

    const report = joi.validate(query, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions',
        statusCode: '422',
      });

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
          global.app.prom.requests.inc({
            method: 'GET',
            endpoint: '/api/transactions',
            statusCode: '200',
          });

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

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions',
        statusCode: '200',
      });

      return res.json(result);
    } catch (e) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions',
        statusCode: '500',
      });

      global.app.logger.error('Failed to get transactions');
      global.app.logger.error(e);
      return next('Server Error');
    }
  };

  private countTransactions = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    try {
      const { query } = req;
      const schema = joi
        .object()
        .keys({
          senderId: joi.string().address(),
          senderPublicKey: joi.string().publicKey(),
        })
        .required();

      const report = joi.validate(query, schema);
      if (report.error) {
        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/transactions/count',
          statusCode: '422',
        });

        return res.status(422).send({
          success: false,
          error: report.error.message,
        });
      }

      const condition = {};
      if (query.senderId) {
        condition.senderId = query.senderId;
      }
      if (query.senderPublicKey) {
        condition.senderPublicKey = query.senderPublicKey;
      }

      const count = await global.app.sdb.count<Transaction>(
        Transaction,
        condition
      );
      return res.json({
        success: true,
        count,
      });
    } catch (err) {
      return next('Server Error');
    }
  };

  private newestFirst = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const schema = joi
      .object()
      .keys({
        count: joi
          .number()
          .integer()
          .positive()
          .required(),
        limit: joi
          .number()
          .integer()
          .positive()
          .max(100)
          .optional(),
        offset: joi
          .number()
          .integer()
          .min(0)
          .optional(),
        senderId: joi.string().address(),
        senderPublicKey: joi.string().publicKey(),
      })
      .required();

    const report = joi.validate(query, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions/newestFirst',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const limit: number = ((query.limit as unknown) as number) || 100;
    const offset: number = ((query.offset as unknown) as number) || 0;
    const count = (query.count as unknown) as number;

    const condition = {};
    if (query.senderId) {
      condition.senderId = query.senderId;
    }
    if (query.senderPublicKey) {
      condition.senderPublicKey = query.senderPublicKey;
    }

    try {
      const dbCount = await global.app.sdb.count<Transaction>(
        Transaction,
        condition
      );

      if (count > dbCount) {
        return next(
          'parameter count is greater than actual number of transactions'
        );
      }
      if (offset > count) {
        return next('parameter offset is greater than parameter count');
      }
    } catch (err) {
      return next('Server error');
    }

    try {
      // is end needed?
      const [start, end, difference] = TransactionsHelper.reverseTransactions(
        count,
        offset,
        limit
      );

      let transactions = await global.app.sdb.findAll<Transaction>(
        Transaction,
        {
          condition,
          offset: start,
          limit: difference,
        }
      );

      if (!transactions) {
        transactions = [];
      }
      transactions = transactions.reverse();

      const result = {
        success: true,
        // offset: start,
        // limit: difference,
        count,
        transactions: transactions as ITransaction[],
      };

      return res.json(result);
    } catch (err) {
      return next(err.message);
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
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions/unconfirmed/get',
        statusCode: '422',
      });

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
    if (!unconfirmedTransaction) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions/unconfirmed/get',
        statusCode: '500',
      });

      return next('Transaction not found');
    } else {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions/unconfirmed/get',
        statusCode: '200',
      });

      return res.json(result);
    }
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
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions/unconfirmed',
        statusCode: '422',
      });

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

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/transactions/unconfirmed',
      statusCode: '200',
    });

    const result: ApiResult<TransactionsWrapper> = {
      success: true,
      transactions: toSend,
    };
    return res.json(result);
  };

  private getTransactionConfirmations = async (
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
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/transactions/confirmations',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const transaction = await global.app.sdb.findOne<Transaction>(Transaction, {
      condition: {
        id: query.id,
      },
    });

    if (transaction === undefined) {
      return next('transaction not included in any block');
    }

    const height = StateHelper.getState().lastBlock.height;
    const diff = new BigNumber(height).minus(transaction.height).toFixed();

    const result: ApiResult<TransactionConfirmationWrapper> = {
      success: true,
      info: {
        id: query.id,
        confirmations: String(diff),
        inBlock: String(transaction.height),
        currentBlock: String(height),
      },
    };
    return res.json(result);
  };
}
