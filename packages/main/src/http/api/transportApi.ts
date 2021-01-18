import * as express from 'express';
import { Request, Response } from 'express';
import * as os from 'os';
import {
  IScope,
  Next,
  IHttpApi,
  UnconfirmedTransaction,
  ApiResult,
  TransactionIdWrapper,
  UnconfirmedTransactionsWrapper,
  P2PApiResult,
} from '@gny/interfaces';
import { TransactionBase } from '@gny/base';
import { BlocksHelper } from '../../../src/core/BlocksHelper';
import { StateHelper } from '../../../src/core/StateHelper';
import Transactions from '../../../src/core/transactions';

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

    router.post('/transactions', this.transactions);
    router.post('/getUnconfirmedTransactions', this.getUnconfirmedTransactions);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/peer', router);

    this.library.network.app.use(
      (err: string, req: Request, res: Response, next) => {
        if (!err) return next();
        this.library.logger.error(req.url);
        this.library.logger.error(err);

        return res.status(500).json({ success: false, error: err.toString() });
      }
    );
  };

  // POST
  private transactions = (req: Request, res: Response, next: Next) => {
    const span = global.library.tracer.startSpan(
      'receive transaction via http'
    );

    let unconfirmedTrs: UnconfirmedTransaction;
    try {
      span.log({
        value: 'normalize transaction',
      });

      unconfirmedTrs = TransactionBase.normalizeUnconfirmedTransaction(
        req.body.transaction
      );
    } catch (e) {
      this.library.logger.error('Received transaction parse error');
      this.library.logger.error(
        `detail: ${JSON.stringify(
          {
            raw: req.body,
            trs: unconfirmedTrs,
            error: e.toString(),
          },
          null,
          2
        )}`
      );

      span.setTag('error', true);
      span.log({
        value: `Received transaction parse error: ${e.message}`,
        unconfirmedTrs,
      });
      span.finish();

      return next('Invalid transaction body');
    }

    span.setTag('transactionId', unconfirmedTrs.id);
    span.setTag('senderId', unconfirmedTrs.senderId);

    const finished = err => {
      if (err) {
        span.finish();

        const errMsg: string = err.message ? err.message : err.toString();
        return next(`Error: ${errMsg}`);
      } else {
        span.finish();

        this.library.bus.message(
          'onUnconfirmedTransaction',
          unconfirmedTrs,
          span
        );
        const result: ApiResult<TransactionIdWrapper> = {
          success: true,
          transactionId: unconfirmedTrs.id,
        };
        return res.status(200).json(result);
      }
    };

    return this.library.sequence.add(
      async cb => {
        span.log({
          value: 'start sequence',
        });

        const state = StateHelper.getState();
        span.log({
          lastBlock: state.lastBlock,
        });

        if (
          !BlocksHelper.IsBlockchainReady(
            state,
            Date.now(),
            this.library.logger
          )
        ) {
          span.setTag('error', true);
          span.log({
            value: 'Blockchain is not ready',
          });

          return cb('Blockchain is not ready');
        }

        try {
          await Transactions.processUnconfirmedTransactionAsync(
            state,
            unconfirmedTrs,
            span
          );
        } catch (err) {
          span.setTag('error', true);
          span.log({
            value: `error during processing transaction: ${err.message}`,
          });

          this.library.logger.warn(
            `Receive invalid transaction ${unconfirmedTrs.id}`
          );
          this.library.logger.warn(err);

          return cb(err.message);
        }

        return cb();
      },
      undefined,
      finished
    );
  };

  // POST
  private getUnconfirmedTransactions = (req: Request, res: Response) => {
    const result: P2PApiResult<UnconfirmedTransactionsWrapper, null> = {
      transactions: StateHelper.GetUnconfirmedTransactionList(),
    };
    return res.json(result);
  };
}
