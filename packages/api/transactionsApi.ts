import * as crypto from 'crypto';
import * as ed from '../../src/utils/ed';
import * as express from 'express';
import { Modules, IScope, KeyPair } from "../../src/interfaces";

export default class TransactionsApi {
  private modules : Modules;
  private library: IScope;
  constructor(modules: Modules, scope: IScope) {
    this.modules = modules;
    this.library = scope;

    this.attachApi();
  }

  private getTransactions = (req, cb) => {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
        offset: {
          type: 'integer',
          minimum: 0,
        },
        id: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
        blockId: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
      },
    }, (err) => {
      if (err) {
        return cb(err[0].message);
      }

      const limit = query.limit || 100;
      const offset = query.offset || 0;

      const condition = {};
      if (query.senderId) {
        condition.senderId = query.senderId;
      }
      if (query.type !== undefined) {
        const type = Number(query.type);
        if (type !== 0 && type !== 14) return cb('invalid transaction type');

        condition.currency = type === 0 ? 'GNY' : { $ne: 'GNY' };
      }
      if (query.id) {
        condition.tid = query.id;
      }

      (async () => {
        try {
          let block;
          if (query.blockId) {
            block = await global.app.sdb.getBlockById(query.blockId);
            if (block === undefined) {
              return cb(null, { transactions: [], count: 0 });
            }
            condition.height = block.height;
          }
          const count = await global.app.sdb.count('Transfer', condition);
          let transfer = await global.app.sdb.find('Transfer', condition, query.unlimited ? {} : { limit, offset });
          if (!transfer) transfer = [];
          return cb(null, { transfer, count });
        } catch (e) {
          global.app.logger.error('Failed to get transactions', e);
          return cb(`System error: ${e}`);
        }
      })();
      return null;
    });
  }

  private getTransaction = (req, cb) => {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
      },
      required: ['id'],
    }, (err) => {
      if (err) {
        return cb(err[0].message);
      }
      const callback = (err2, ret) => (async () => {
        if (err2) return cb(err2);

        if (!ret || !ret.transactions || ret.transactions.length < 1) {
          cb('transaction not found', ret);
        } else {
          // for exchanges ....
          const transaction = ret.transactions[0];
          transaction.height = String(transaction.height);
          transaction.confirmations = String(transaction.confirmations);

          cb(null, { transaction });
        }
      })();
      return this.getTransactions(req, callback);
    });
  }

  private getUnconfirmedTransaction = (req, cb) => {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          minLength: 1,
          maxLength: 64,
        },
      },
      required: ['id'],
    }, (err) => {
      if (err) {
        return cb(err[0].message);
      }

      const unconfirmedTransaction = this.modules.transactions.getUnconfirmedTransaction(query.id);

      return !unconfirmedTransaction
        ? cb('Transaction not found')
        : cb(null, { transaction: unconfirmedTransaction });
    });
  }

  private getUnconfirmedTransactions = (req, cb) => {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        senderPublicKey: {
          type: 'string',
          format: 'publicKey',
        },
        address: {
          type: 'string',
        },
      },
    }, (err) => {
      if (err) {
        return cb(err[0].message);
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

      return cb(null, { transactions: toSend });
    });
  }

  private addTransactionUnsigned = (req, cb) => {
    const query = req.body;
    if (query.type !== undefined) {
      query.type = Number(query.type);
    }
    const valid = this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        secret: { type: 'string', maxLength: 100 },
        fee: { type: 'integer', min: 1 },
        type: { type: 'integer', min: 1 },
        args: { type: 'array' },
        message: { type: 'string', maxLength: 50 },
        senderId: { type: 'string', maxLength: 50 },
        mode: { type: 'integer', min: 0, max: 1 },
      },
      required: ['secret', 'fee', 'type'],
    });
    if (!valid) {
      this.library.logger.warn('Failed to validate query params', this.library.scheme.getLastError());
      return setImmediate(cb, this.library.scheme.getLastError().details[0].message);
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
          callback(null, { transactionId: trs.id });
        } catch (e) {
          this.library.logger.warn('Failed to process unsigned transaction', e);
          callback(e.toString());
        }
      })();
    }, cb);
  }

  private addTransactions = (req, cb) => {
    if (!req.body || !req.body.transactions) {
      return cb('Invalid params');
    }
    const trs = req.body.transactions;
    try {
      for (const t of trs) {
        this.library.base.transaction.objectNormalize(t);
      }
    } catch (e) {
      return cb(`Invalid transaction body: ${e.toString()}`);
    }
    return this.library.sequence.add((callback) => {
      this.modules.transactions.processUnconfirmedTransactions(trs, callback);
    }, cb);
  }

  private attachApi = () => {
    const router = express.Router();

    router.use((req, res, next) => {
      if (this.modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' })
    });

    router.get('/', this.getTransactions);
    router.get('/get', this.getTransaction);
    router.get('/unconfirmed/get', this.getUnconfirmedTransaction);
    router.get('/unconfirmed', this.getUnconfirmedTransactions);
    router.put('/', this.addTransactionUnsigned);
    router.put('/batch', this.addTransactions);
    // router.map(this.shared, {
    //   'get /': 'getTransactions',
    //   'get /get': 'getTransaction',
    //   'get /unconfirmed/get': 'getUnconfirmedTransaction',
    //   'get /unconfirmed': 'getUnconfirmedTransactions',
    //   'put /': 'addTransactionUnsigned',
    //   'put /batch': 'addTransactions',
    // });

    router.use((req: any, res: any) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' })
    });

    this.library.network.app.use('/api/transactions', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err.toString())
      return res.status(500).send({ success: false, error: err.toString() })
    });
  }
}