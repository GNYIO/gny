import * as express from 'express';
import { Request, Response } from 'express';
import * as os from 'os';
import {
  IScope,
  Next,
  ManyVotes,
  ITransaction,
  IBlock,
  IHttpApi,
  UnconfirmedTransaction,
  ApiResult,
  NewBlockWrapper,
  CommonBlockWrapper,
  BlocksWrapper,
  TransactionIdWrapper,
  UnconfirmedTransactionsWrapper,
  HeightWrapper,
  P2PApiResult,
} from '@gny/interfaces';
import { TransactionBase } from '@gny/base';
import { BlocksHelper } from '../../../src/core/BlocksHelper';
import { getBlocks as getBlocksFromApi } from '../util';
import { joi } from '@gny/extendedJoi';
import { StateHelper } from '../../../src/core/StateHelper';
import Transactions from '../../../src/core/transactions';
import { BigNumber } from 'bignumber.js';

const osInfo = {
  getOS() {
    return os.platform() + os.release();
  },
  getVersion() {
    return global.Config.version;
  },
  getPort() {
    return global.Config.port;
  },
  getMagic() {
    return global.Config.magic;
  },
};

export default class TransportApi implements IHttpApi {
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
  public attachApi = () => {
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
      return res.status(422).send({
        success: false,
        error: 'Invalid params',
      });
    }
    // validate id
    const schema = joi.object().keys({
      id: joi
        .string()
        .hex()
        .required(),
    });
    const report = joi.validate(body, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: 'validation failed',
      });
    }

    const newBlock = StateHelper.GetBlockFromLatestBlockCache(body.id);
    if (!newBlock) {
      return next('New block not found');
    }
    const result: ApiResult<NewBlockWrapper> = {
      success: true,
      block: newBlock.block,
      votes: newBlock.votes,
    };
    return res.json(result);
  };

  // POST
  private commonBlock = async (req: Request, res: Response, next: Next) => {
    const { body } = req;

    const schema = joi.object().keys({
      max: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      min: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      ids: joi
        .array()
        .items(
          joi
            .string()
            .hex()
            .required()
        )
        .min(1)
        .required(),
    });
    const report = joi.validate(body, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: 'validation failed: ' + report.error.message,
      });
    }

    // prevent DDOS attack
    const difference = new BigNumber(body.max).minus(body.min).absoluteValue();
    if (difference.isGreaterThanOrEqualTo(10)) {
      return next('too big min,max');
    }

    const max: string = body.max;
    const min: string = body.min;
    const ids: string[] = body.ids;
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
      const result: ApiResult<CommonBlockWrapper> = {
        success: true,
        common: commonBlock,
      };
      return res.json(result);
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
        .max(200)
        .optional(),
      lastBlockId: joi
        .string()
        .hex()
        .required(),
    });
    const report = joi.validate(body, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: 'Invalid params',
      });
    }

    const blocksLimit: number = body.limit || 200;
    const lastBlockId: string = body.lastBlockId;
    if (!lastBlockId) {
      return res.status(422).send({
        success: false,
        error: 'Invalid params',
      });
    }

    let result: P2PApiResult<BlocksWrapper>;
    try {
      const lastBlock = await global.app.sdb.getBlockById(lastBlockId);
      if (!lastBlock) throw new Error(`Last block not found: ${lastBlockId}`);

      const minHeight = new BigNumber(lastBlock.height).plus(1).toFixed();
      const maxHeight = new BigNumber(minHeight)
        .plus(blocksLimit)
        .minus(1)
        .toFixed();
      // global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight, true); // better?
      const blocks = await getBlocksFromApi(minHeight, maxHeight, true);
      result = {
        blocks,
      };
      return res.json(result);
    } catch (e) {
      global.app.logger.error(
        '/peer/blocks (POST), Failed to get blocks with transactions',
        e
      );
      result = {
        blocks: [] as IBlock[],
      };
      return res.json(result);
    }
  };

  // POST
  private transactions = (req: Request, res: Response, next: Next) => {
    let unconfirmedTrs: UnconfirmedTransaction;
    try {
      unconfirmedTrs = TransactionBase.normalizeUnconfirmedTransaction(
        req.body.transaction
      );
    } catch (e) {
      this.library.logger.error('Received transaction parse error', {
        raw: req.body,
        trs: unconfirmedTrs,
        error: e.toString(),
      });
      return next('Invalid transaction body');
    }

    const finished = err => {
      if (err) {
        this.library.logger.warn(
          `Receive invalid transaction ${unconfirmedTrs.id}`,
          err
        );
        const errMsg = err.message ? err.message : err.toString();
        return next(errMsg);
      } else {
        this.library.bus.message('onUnconfirmedTransaction', unconfirmedTrs);
        const result: P2PApiResult<TransactionIdWrapper> = {
          transactionId: unconfirmedTrs.id,
        };
        return res.status(200).json(result);
      }
    };

    return this.library.sequence.add(
      cb => {
        const state = StateHelper.getState();
        if (
          !BlocksHelper.IsBlockchainReady(
            state,
            Date.now(),
            this.library.logger
          )
        ) {
          return cb('Blockchain is not ready');
        }

        Transactions.processUnconfirmedTransaction(state, unconfirmedTrs, cb);
      },
      undefined,
      finished
    );
  };

  // POST
  private votes = (req: Request, res: Response, next: Next) => {
    const votes = req.body.votes;
    const schema = joi.object().keys({
      height: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      id: joi
        .string()
        .length(64)
        .required(),
      signatures: joi
        .array()
        .items({
          publicKey: joi
            .string()
            .publicKey()
            .required(),
          signature: joi.string().required(),
        })
        .required(),
    });
    const report = joi.validate(votes, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    this.library.bus.message('onReceiveVotes', req.body.votes as ManyVotes);
    res.json({});
  };

  // POST
  private getUnconfirmedTransactions = (req: Request, res: Response) => {
    const result: P2PApiResult<UnconfirmedTransactionsWrapper> = {
      transactions: StateHelper.GetUnconfirmedTransactionList(),
    };
    return res.json(result);
  };

  // POST
  private getHeight = (req: Request, res: Response) => {
    const lastBlock = StateHelper.getState().lastBlock;
    const result: P2PApiResult<HeightWrapper> = {
      height: lastBlock.height,
    };
    return res.json(result);
  };
}
