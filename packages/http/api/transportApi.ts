import * as express from 'express';
import osInfo from '../../../src/utils/osInfo';
import { Request, Response } from 'express';
import {
  Modules,
  IScope,
  Next,
  ManyVotes,
  Transaction,
  IBlock,
} from '../../../src/interfaces';
import { TransactionBase } from '../../../src/base/transaction';
import { BlocksHelper } from '../../../src/core/BlocksHelper';
import { getBlocks as getBlocksFromApi } from '../util';
import joi from '../../../src/utils/extendedJoi';
import { StateHelper } from '../../../src/core/StateHelper';
import Transactions from '../../../src/core/transactions';

export default class TransportApi {
  private library: IScope;
  private headers: any;
  constructor(scope: IScope) {
    this.library = scope;
    this.headers = {
      os: osInfo.getOS(),
      version: osInfo.getVersion(),
      port: osInfo.getPort(),
      magic: osInfo.getMagic(),
    };
    this.attachApi();
  }

  // Events
  private attachApi = () => {
    const router = express.Router();

    // Middleware
    router.use((req: Request, res: Response, next) => {
      if (!StateHelper.BlockchainReady()) {
        return res.json({ success: false, error: 'Blockchain is loading' });
      }
      if (StateHelper.IsSyncing()) {
        return res
          .status(500)
          .json({ success: false, error: 'Blockchain is syncing' });
      }

      res.set(this.headers);

      if (req.headers.magic !== this.library.config.magic) {
        return res.status(500).json({
          success: false,
          error: 'Request is made on the wrong network',
          expected: this.library.config.magic,
          received: req.headers.magic,
        });
      }
      return next();
    });

    router.post('/newBlock', this.newBlock);
    router.post('/commonBlock', this.commonBlock);
    router.post('/blocks', this.blocks);
    router.post('/transactions', this.transactions);
    router.post('/votes', this.votes);
    router.post('/getUnconfirmedTransactions', this.getUnconfirmedTransactions);
    router.post('/getHeight', this.getHeight);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/peer', router);

    this.library.network.app.use(
      (err: string, req: Request, res: Response, next) => {
        if (!err) return next();
        this.library.logger.error(req.url, err.toString());
        return res.status(500).json({ success: false, error: err.toString() });
      }
    );
  };

  // POST
  public newBlock = (req: Request, res: Response, next: Next) => {
    const { body } = req;
    if (!body.id) {
      return next('Invalid params');
    }
    // validate id
    const schema = this.library.joi.object().keys({
      id: this.library.joi
        .string()
        .hex()
        .required(),
    });
    const report = this.library.joi.validate(body, schema);
    if (report.error) {
      return next('validation failed');
    }

    const newBlock = StateHelper.GetBlockFromLatestBlockCache(body.id);
    if (!newBlock) {
      return next('New block not found');
    }
    return res.json({
      success: true,
      block: newBlock.block,
      votes: newBlock.votes,
    });
  };

  // POST
  private commonBlock = async (req: Request, res: Response, next: Next) => {
    const { body } = req;

    const schema = joi.object().keys({
      max: joi
        .number()
        .integer()
        .min(0)
        .required(),
      min: joi
        .number()
        .integer()
        .min(0)
        .required(),
      ids: joi
        .array()
        .items(
          joi
            .string()
            .hex()
            .required()
        )
        .required(),
    });
    const report = joi.validate(body, schema);
    if (report.error) {
      return next('validation failed: ' + report.error.message);
    }

    const max = body.max;
    const min = body.min;
    const ids = body.ids;
    try {
      let blocks = await global.app.sdb.getBlocksByHeightRange(min, max);
      if (!blocks || !blocks.length) {
        return next('Blocks not found');
      }
      this.library.logger.warn(
        `blocks-in-transportApi-commonBlock: ${JSON.stringify(blocks)}`
      );
      blocks = blocks.reverse();
      let commonBlock: IBlock = null;
      for (const i in ids) {
        if (blocks[i].id === ids[i]) {
          commonBlock = blocks[i];
          break;
        }
      }
      if (!commonBlock) {
        return next('Common block not found');
      }
      return res.json({ success: true, common: commonBlock });
    } catch (e) {
      global.app.logger.error(`Failed to find common block: ${e}`);
      return next('Failed to find common block');
    }
  };

  // POST
  private blocks = async (req: Request, res: Response, next: Next) => {
    const { body } = req;

    const schema = joi.object().keys({
      limit: joi
        .number()
        .integer()
        .min(0)
        .optional(),
      lastBlockId: joi
        .string()
        .hex()
        .required(),
    });
    const report = joi.validate(body, schema);
    if (report.error) {
      return next('Invalid params');
    }

    const blocksLimit = body.limit || 200;
    const lastBlockId = body.lastBlockId;
    if (!lastBlockId) {
      return next('Invalid params');
    }

    try {
      const lastBlock = await global.app.sdb.getBlockById(lastBlockId);
      if (!lastBlock) throw new Error(`Last block not found: ${lastBlockId}`);

      const minHeight = Number(lastBlock.height) + 1;
      const maxHeight = minHeight + blocksLimit - 1;
      // global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight, true); // better?
      const blocks = await getBlocksFromApi(minHeight, maxHeight, true);
      return res.json({ blocks });
    } catch (e) {
      global.app.logger.error(
        '/peer/blocks (POST), Failed to get blocks with transactions',
        e
      );
      return res.json({ blocks: [] });
    }
  };

  // POST
  private transactions = (req: Request, res: Response, next: Next) => {
    let transaction: Transaction;
    try {
      transaction = TransactionBase.normalizeTransaction(req.body.transaction);
    } catch (e) {
      this.library.logger.error('Received transaction parse error', {
        raw: req.body,
        trs: transaction,
        error: e.toString(),
      });
      return next('Invalid transaction body');
    }

    const finished = err => {
      if (err) {
        this.library.logger.warn(
          `Receive invalid transaction ${transaction.id}`,
          err
        );
        const errMsg = err.message ? err.message : err.toString();
        return next(errMsg);
      } else {
        this.library.bus.message('onUnconfirmedTransaction', transaction);
        return res
          .status(200)
          .json({ success: true, transactionId: transaction.id });
      }
    };

    return this.library.sequence.add(
      cb => {
        const state = BlocksHelper.getState();
        if (!BlocksHelper.IsBlockchainReady(state, this.library.logger)) {
          return cb('Blockchain is not ready');
        }

        Transactions.processUnconfirmedTransaction(state, transaction, cb);
      },
      undefined,
      finished
    );
  };

  // POST
  private votes = (req: Request, res: Response, next: Next) => {
    const votes = req.body.votes;
    const schema = this.library.joi.object().keys({
      height: this.library.joi
        .number()
        .integer()
        .min(0)
        .required(),
      id: this.library.joi
        .string()
        .length(64)
        .required(),
      signatures: this.library.joi
        .array()
        .items({
          publicKey: this.library.joi
            .string()
            .publicKey()
            .required(),
          signature: this.library.joi.string().required(),
        })
        .required(),
    });
    const report = this.library.joi.validate(votes, schema);
    if (report.error) {
      return next(report.error.message);
    }

    this.library.bus.message('onReceiveVotes', req.body.votes as ManyVotes);
    res.json({});
  };

  // POST
  private getUnconfirmedTransactions = (req: Request, res: Response) => {
    return res.json({
      transactions: StateHelper.GetUnconfirmedTransactionList(),
    });
  };

  // POST
  private getHeight = (req: Request, res: Response) => {
    const lastBlock = BlocksHelper.getState().lastBlock;

    return res.json({
      height: lastBlock.height,
    });
  };
}
