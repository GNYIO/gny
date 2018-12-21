import * as express from 'express';
import slots from '../../src/utils/slots';
import { Modules, IScope } from '../../src/interfaces';

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

  private attachApi() {
    const router = express.Router();

    router.use((req, res, next) => {
      if (this.modules.loader.syncing()) {
        return res.status(500).send({
          success: false,
          error: 'Blockchain is syncing',
        });
      }

      res.set(this.headers);

      if (req.headers.magic !== this.library.config.magic) {
        return res.status(500).send({
          success: false,
          error: 'Request is made on the wrong network',
          expected: this.library.config.magic,
          received: req.headers.magic,
        });
      }
      return next();
    });

    router.post('/newBlock', (req, res) => {
      const { body } = req;
      if (!body.id) {
        return res.status(500).send({ error: 'Invalid params' });
      }
      const newBlock = this.modules.transport.latestBlocksCache.get(body.id);
      if (!newBlock) {
        return res.status(500).send({ error: 'New block not found' });
      }
      return res.send({ success: true, block: newBlock.block, votes: newBlock.votes });
    });

    router.post('/commonBlock', (req, res) => {
      const { body } = req;
      if (!Number.isInteger(body.max)) return res.send({ error: 'Field max must be integer' });
      if (!Number.isInteger(body.min)) return res.send({ error: 'Field min must be integer' });
      const max = body.max;
      const min = body.min;
      const ids = body.ids;
      return (async () => {
        try {
          let blocks = await global.app.sdb.getBlocksByHeightRange(min, max);
          if (!blocks || !blocks.length) {
            return res.status(500).send({ success: false, error: 'Blocks not found' });
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
            return res.status(500).send({ success: false, error: 'Common block not found' });
          }
          return res.send({ success: true, common: commonBlock });
        } catch (e) {
         global.app.logger.error(`Failed to find common block: ${e}`);
          return res.send({ success: false, error: 'Failed to find common block' });
        }
      })();
    });

    router.post('/blocks', (req, res) => {
      const { body } = req;
      let blocksLimit = 200;
      if (body.limit) {
        blocksLimit = Math.min(blocksLimit, Number(body.limit));
      }
      const lastBlockId = body.lastBlockId;
      if (!lastBlockId) {
        return res.status(500).send({ error: 'Invalid params' });
      }
      return (async () => {
        try {
          const lastBlock = await global.app.sdb.getBlockById(lastBlockId);
          if (!lastBlock) throw new Error(`Last block not found: ${lastBlockId}`);

          const minHeight = lastBlock.height + 1;
          const maxHeight = (minHeight + blocksLimit) - 1;
          const blocks = await this.modules.blocks.getBlocks(minHeight, maxHeight, true);
          return res.send({ blocks });
        } catch (e) {
         global.app.logger.error('Failed to get blocks or transactions', e);
          return res.send({ blocks: [] });
        }
      })();
    });

    router.post('/transactions', (req, res) => {
      const lastBlock = this.modules.blocks.getLastBlock();
      const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
      if (slots.getNextSlot() - lastSlot >= 12) {
        this.library.logger.error('Blockchain is not ready', {
          getNextSlot: slots.getNextSlot(),
          lastSlot,
          lastBlockHeight: lastBlock.height,
        });
        return res.status(200).json({ success: false, error: 'Blockchain is not ready' });
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
        return res.status(200).json({ success: false, error: 'Invalid transaction body' });
      }

      return this.library.sequence.add((cb) => {
        this.library.logger.info(`Received transaction ${transaction.id} from http client`);
        this.modules.transactions.processUnconfirmedTransaction(transaction, cb);
      }, (err) => {
        if (err) {
          this.library.logger.warn(`Receive invalid transaction ${transaction.id}`, err);
          const errMsg = err.message ? err.message : err.toString();
          res.status(200).json({ success: false, error: errMsg });
        } else {
          this.library.bus.message('unconfirmedTransaction', transaction);
          res.status(200).json({ success: true, transactionId: transaction.id });
        }
      });
    });

    router.post('/votes', (req, res) => {
      this.library.bus.message('receiveVotes', req.body.votes);
      res.send({});
    });

    router.post('/getUnconfirmedTransactions', (req, res) => {
      res.send({ transactions: this.modules.transactions.getUnconfirmedTransactionList() });
    });

    router.post('/getHeight', (req, res) => {
      res.send({
        height: this.modules.blocks.getLastBlock().height,
      });
    });

    router.use((req, res) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/peer', router);
  }
}