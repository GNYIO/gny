import LimitCache from '../utils/limit-cache';
import TransactionPool from '../utils/transaction-pool';
import { Modules, IScope, Transaction } from '../interfaces';

export default class Transactions {
  private readonly library: IScope;
  private modules: Modules;
  private pool: TransactionPool;
  private failedTrsCache: LimitCache;

  constructor(scope: IScope) {
    this.library = scope;
    this.pool = new TransactionPool();
    this.failedTrsCache = new LimitCache();
  }

  getUnconfirmedTransaction = (id: string) => this.pool.get(id);

  getUnconfirmedTransactionList = () => this.pool.getUnconfirmed();

  removeUnconfirmedTransaction = (id: string) => this.pool.remove(id);

  hasUnconfirmed = (id: string) => this.pool.has(id);

  clearUnconfirmed = () => this.pool.clear();

  getUnconfirmedTransactions = cb =>
    setImmediate(cb, null, {
      transactions: this.getUnconfirmedTransactionList(),
    });

  getTransactions = (req, cb) => {
    const query = req.body;
    const limit = query.limit ? Number(query.limit) : 100;
    const offset = query.offset ? Number(query.offset) : 0;
    const condition: { senderId?: string; type?: number } = {};
    if (query.senderId) {
      condition.senderId = query.senderId;
    }
    if (query.type) {
      condition.type = Number(query.type);
    }

    (async () => {
      try {
        const count = await global.app.sdb.count('Transaction', condition);

        let transactions = await global.app.sdb.find(
          'Transaction',
          condition,
          limit,
          {},
          [],
          offset
        );
        if (!transactions) transactions = [];
        return cb(null, { transactions, count });
      } catch (e) {
        global.app.logger.error('Failed to get transactions', e);
        return cb(`System error: ${e}`);
      }
    })();
  };

  getTransaction = (req, cb) => {
    (async () => {
      try {
        if (!req.params || !req.params.id) return cb('Invalid transaction id');
        const id = req.params.id;
        const trs = await global.app.sdb.find('Transaction', { id: id });
        if (!trs || !trs.length) return cb('Transaction not found');
        return cb(null, { transaction: trs[0] });
      } catch (e) {
        return cb(`System error: ${e}`);
      }
    })();
  };

  applyTransactionsAsync = async (transactions: Transaction[]) => {
    for (let i = 0; i < transactions.length; ++i) {
      await this.applyUnconfirmedTransactionAsync(transactions[i]);
    }
  };

  processUnconfirmedTransactions = (transactions: Transaction[], cb) => {
    (async () => {
      try {
        for (const transaction of transactions) {
          await this.processUnconfirmedTransactionAsync(transaction);
        }
        cb(null, transactions);
      } catch (e) {
        cb(e.toString(), transactions);
      }
    })();
  };

  processUnconfirmedTransactionsAsync = async (transactions: Transaction[]) => {
    for (const transaction of transactions) {
      await this.processUnconfirmedTransactionAsync(transaction);
    }
  };

  processUnconfirmedTransaction = (transaction: Transaction, cb) => {
    (async () => {
      try {
        await this.processUnconfirmedTransactionAsync(transaction);
        cb(null, transaction);
      } catch (e) {
        cb(e.toString(), transaction);
      }
    })();
  };

  processUnconfirmedTransactionAsync = async (transaction: Transaction) => {
    try {
      if (!transaction.id) {
        transaction.id = this.library.base.transaction.getId(transaction);
      } else {
        const id = this.library.base.transaction.getId(transaction);
        if (transaction.id !== id) {
          throw new Error('Invalid transaction id');
        }
      }

      if (this.modules.blocks.isCollectingVotes()) {
        throw new Error('Block consensus in processing');
      }

      if (this.failedTrsCache.has(transaction.id)) {
        throw new Error('Transaction already processed');
      }
      if (this.pool.has(transaction.id)) {
        throw new Error('Transaction already in the pool');
      }
      const exists = await global.app.sdb.exists('Transaction', {
        id: transaction.id,
      });
      if (exists) {
        throw new Error('Transaction already confirmed');
      }
      await this.applyUnconfirmedTransactionAsync(transaction);
      this.pool.add(transaction);
      return transaction;
    } catch (e) {
      this.failedTrsCache.set(transaction.id, true);
      throw e;
    }
  };

  applyUnconfirmedTransactionAsync = async (transaction: Transaction) => {
    this.library.logger.debug('apply unconfirmed trs', transaction);

    const height = await this.modules.blocks.getLastBlock().height;
    const block = {
      height: height + 1,
    };

    const senderId = transaction.senderId;
    if (!senderId) {
      throw new Error('Missing sender address');
    }
    if (
      global.app.util.address.isAddress(senderId) &&
      !transaction.senderPublicKey
    ) {
      throw new Error('Sender public key not provided');
    }

    let sender = await global.app.sdb.load('Account', { address: senderId });
    if (!sender) {
      if (height > 0) throw new Error('Sender account not found');
      sender = await global.app.sdb.create('Account', {
        address: senderId,
        username: null,
        gny: 0,
      });
    }

    const context = {
      trs: transaction,
      block,
      sender,
    };
    if (height > 0) {
      const error = await this.library.base.transaction.verify(context);
      if (error) throw new Error(error);
    }

    try {
      global.app.sdb.beginContract();
      await this.library.base.transaction.apply(context);
      global.app.sdb.commitContract();
    } catch (e) {
      global.app.sdb.rollbackContract();
      this.library.logger.error(e);
      throw e;
    }
  };

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope;
  };
}
