import * as crypto from 'crypto';
import * as ed from '../../src/utils/ed';
import * as express from 'express';
import { Request, Response } from 'express';
import { Modules, IScope, KeyPair, Next } from '../../src/interfaces';

export default class TransactionsApi {
  private modules: Modules;
  private library: IScope;
  constructor(modules: Modules, scope: IScope) {
    this.modules = modules;
    this.library = scope;

    this.attachApi();
  }

  private attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (this.modules) return next();
      return res.status(500).json({ success: false, error: 'Blockchain is loading' });
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
    this.library.network.app.use((err: any, req: Request, res: Response, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).json({ success: false, error: err.toString() });
    });
  }

  private getTransactions = async (req: Request, res: Response, next: Next) => {
    const query = req.body;
    const schema = this.library.joi.object().keys({
      limit: this.library.joi.number().min(0).max(100),
      offset: this.library.joi.number().min(0),
      id: this.library.joi.string().min(1).max(100),
      blockId: this.library.joi.string().min(1).max(100),
      type: this.library.joi.number().min(0).max(1000),
      height: this.library.joi.number().min(0),
      message: this.library.joi.string(),
    });

    const report = this.library.joi.validate(query, schema);
    if (report.error) {
      return next(report.error.message);
    }

    const limit = query.limit || 100;
    const offset = query.offset || 0;

    const condition = {};
    if (query.senderId) {
      condition.senderId = query.senderId;
    }
    if (query.type !== undefined) {
      const type = Number(query.type);

      condition.currency = type === 0 ? 'GNY' : { $ne: 'GNY' };
    }
    if (query.id) {
      condition.tid = query.id;
    }
    if (query.message) {
      condition.message = query.message;
    }

    try {
      let block;
      if (query.blockId) {
        block = await global.app.sdb.getBlockById(query.blockId);
        if (block === undefined) {
          return res.json({ transactions: [], count: 0 });
        }
        condition.height = block.height;
      }
      const count = await global.app.sdb.count('Transfer', condition);
      let transfer = await global.app.sdb.find('Transfer', condition, query.unlimited ? {} : { limit, offset });
      if (!transfer) transfer = [];
      return res.json({ transfer, count });
    } catch (e) {
      global.app.logger.error('Failed to get transactions', e);
      return next(`System error: ${e}`);
    }
  }

  private getUnconfirmedTransaction = (req: Request, res: Response, next: Next) => {
    const query = req.body;
    const typeSchema = this.library.joi.object().keys({
      id: this.library.joi.string().min(1).max(64).required(),
    });
    const report = this.library.joi.validate(query, typeSchema);
    if (report.error) {
      return next(report.error.message);
    }

    const unconfirmedTransaction = this.modules.transactions.getUnconfirmedTransaction(query.id);

    return !unconfirmedTransaction
      ? next('Transaction not found')
      : res.json({ transaction: unconfirmedTransaction });
  }

  private getUnconfirmedTransactions = (req: Request, res: Response, next: Next) => {
    const query = req.body;
    const publicKeyAddress = this.library.joi.object().keys({
      senderPublicKey: this.library.joi.string().publicKey(),
      address: this.library.joi.string().address(),
    });
    const report = this.library.joi.validate(query, publicKeyAddress);
    if (report.error) {
      return next(report.error.message);
    }

    const transactions = this.modules.transactions.getUnconfirmedTransactionList();
    const toSend: any[] = [];

    if (query.senderPublicKey || query.address) {
      for (let i = 0; i < transactions.length; i++) {
        if (transactions[i].senderPublicKey === query.senderPublicKey
          || transactions[i].recipientId === query.address) {
          toSend.push(transactions[i]);
        }
      }
    } else {
      transactions.forEach(t => toSend.push(t));
    }

    return res.json({ transactions: toSend });
  }

  private addTransactionUnsigned = (req: Request, res: Response, next: Next) => {
    const query = req.body;
    if (query.type !== undefined) {
      query.type = Number(query.type);
    }
    const transactionSchema = this.library.joi.object().keys({
      secret: this.library.joi.string().secret().required(),
      fee: this.library.joi.number().min(1).required(),
      type: this.library.joi.number().min(1).required(),
      args: this.library.joi.array(),
      message: this.library.joi.string(),
      senderId: this.library.joi.string().address(),
    });
    const report = this.library.joi.validate(query, transactionSchema);
    if (report.error) {
      this.library.logger.warn('Failed to validate query params', report.error.message);
      return setImmediate(next, (report.error.message));
    }

    this.library.sequence.add((callback) => {
      (async () => {
        try {
          const hash = crypto.createHash('sha256').update(query.secret, 'utf8').digest();
          const keypair = ed.generateKeyPair(hash);
          let secondKeypair: KeyPair = null;
          if (query.secondSecret) {
            secondKeypair = ed.generateKeyPair(crypto.createHash('sha256').update(query.secondSecret, 'utf8').digest());
          }
          const trs = this.library.base.transaction.create({
            secret: query.secret,
            fee: query.fee,
            type: query.type,
            senderId: query.senderId || null,
            args: query.args || null,
            message: query.message || null,
            secondKeypair,
            keypair,
            mode: query.mode,
          });
          await this.modules.transactions.processUnconfirmedTransactionAsync(trs);
          this.library.bus.message('unconfirmedTransaction', trs);
          callback(() => {
             res.json({ transactionId: trs.id });
         });
        } catch (e) {
          this.library.logger.warn('Failed to process unsigned transaction', e);
          callback(() => {
            next(e.toString());
          });
        }
      })();
    });
  }

  private addTransactions = (req: Request, res: Response, next: Next) => {
    if (!req.body || !req.body.transactions) {
      return next('Invalid params');
    }
    const trs = req.body.transactions;
    try {
      for (const t of trs) {
        this.library.base.transaction.objectNormalize(t);
      }
    } catch (e) {
      return next(`Invalid transaction body: ${e.toString()}`);
    }
    return this.library.sequence.add((callback) => {
      this.modules.transactions.processUnconfirmedTransactions(trs, callback);
    }, res);
  }
}