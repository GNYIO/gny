import * as express from 'express';
import slots from '../../src/utils/slots';
import { Request, Response } from 'express';
import { Modules, IScope, Next } from '../../src/interfaces';

export default class TransportApi {
  private modules: Modules;
  private library: IScope;
  private headers: any;
  constructor(modules: Modules, scope: IScope) {
    this.modules = modules;
    this.library = scope;
    this.attachApi();
  }

  // Events
  public onBind = () => {
    this.headers = {
      os: this.modules.system.getOS(),
      version: this.modules.system.getVersion(),
      port: this.modules.system.getPort(),
      magic: this.modules.system.getMagic(),
    };
  }

  private attachApi = () => {
    const router = express.Router();

    // Middleware
    router.use((req: Request, res: Response, next) => {
      if (this.modules.loader.syncing()) {
        return res.status(500).json({
          success: false,
          error: 'Blockchain is syncing',
        });
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
      return res.status(500).json({
        success: false,
        error: 'API endpoint not found'
      });
    });

    this.library.network.app.use('/peer', router);

    this.library.network.app.use((err: string, req: Request, res: Response, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).json({ success: false, error: err.toString() });
    });
  }

  // POST
  public newBlock = (req: Request, res: Response, next: Next) => {
    const { body } = req;
    if (!body.id) {
      return next('Invalid params');
    }
    const newBlock = this.modules.transport.latestBlocksCache.get(body.id);
    if (!newBlock) {
      return next('New block not found');
    }
    return res.json({ success: true, block: newBlock.block, votes: newBlock.votes });
  }

  // POST
  private commonBlock = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    if (!Number.isInteger(body.max)) return next('Field max must be integer');
    if (!Number.isInteger(body.min)) return next('Field min must be integer');
    const max = body.max;
    const min = body.min;
    const ids = body.ids;
    try {
      let blocks = await global.app.sdb.getBlocksByHeightRange(min, max);
      if (!blocks || !blocks.length) {
        return  next('Blocks not found');
      }
      blocks = blocks.reverse();
      let commonBlock = null;
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
  }

  // POST
  private blocks = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    let blocksLimit = 200;
    if (body.limit) {
      blocksLimit = Math.min(blocksLimit, Number(body.limit));
    }
    const lastBlockId = body.lastBlockId;
    if (!lastBlockId) {
      return next('Invalid params');
    }
    try {
      const lastBlock = await global.app.sdb.getBlockById(lastBlockId);
      if (!lastBlock) throw new Error(`Last block not found: ${lastBlockId}`);

      const minHeight = lastBlock.height + 1;
      const maxHeight = (minHeight + blocksLimit) - 1;
      const blocks = await this.modules.blocks.getBlocks(minHeight, maxHeight, true);
      return res.json({ blocks });
    } catch (e) {
     global.app.logger.error('Failed to get blocks or transactions', e);
      return res.json({ blocks: [] });
    }
  }

  // POST
  private transactions = (req: Request, res: Response, next: Next) => {
    const lastBlock = this.modules.blocks.getLastBlock();
    const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
    if (slots.getNextSlot() - lastSlot >= 12) {
      this.library.logger.error('Blockchain is not ready', {
        getNextSlot: slots.getNextSlot(),
        lastSlot,
        lastBlockHeight: lastBlock.height,
      });
      return next('Blockchain is not ready');
    }
    let transaction: any;
    try {
      transaction = this.library.base.transaction.objectNormalize(req.body.transaction);
    } catch (e) {
      this.library.logger.error('Received transaction parse error', {
        raw: req.body,
        trs: transaction,
        error: e.toString(),
      });
      return next('Invalid transaction body');
    }

    const finished = (err) => {
      if (err) {
        this.library.logger.warn(`Receive invalid transaction ${transaction.id}`, err);
        const errMsg = err.message ? err.message : err.toString();
        return next(errMsg);
      } else {
        this.library.bus.message('unconfirmedTransaction', transaction);
        return res.status(200).json({ success: true, transactionId: transaction.id });
      }
    };

    return this.library.sequence.add((cb) => {
      this.library.logger.info(`Received transaction ${transaction.id} from http client`);
      this.modules.transactions.processUnconfirmedTransaction(transaction, cb);
    }, undefined, finished);
  }

  // POST
  private votes = (req: Request, res: Response) => {
    this.library.bus.message('receiveVotes', req.body.votes);
    res.json({});
  }

  // POST
  private getUnconfirmedTransactions = (req: Request, res: Response) => {
    return res.json({ transactions: this.modules.transactions.getUnconfirmedTransactionList() });
  }

  // POST
  private getHeight = (req: Request, res: Response) => {
    return res.json({
      height: this.modules.blocks.getLastBlock().height,
    });
  }



}