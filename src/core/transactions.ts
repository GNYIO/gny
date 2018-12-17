import LimitCache from '../utils/limit-cache';
import addressHelper = require('../utils/address');
import transactionMode from '../utils/transaction-mode';
import TransactionPool from '../utils/transaction-pool';
import { Modules, IScope } from '../interfaces';

export default class Transactions {
  private readonly library: IScope;
  private modules: Modules;
  private genesisBlock: any;
  private pool: TransactionPool;
  private failedTrsCache: LimitCache;

  constructor(scope: IScope) {
    this.library = scope;
    this.genesisBlock = this.library.genesisBlock
    this.pool = new TransactionPool();
    this.failedTrsCache = new LimitCache();
  }

  getUnconfirmedTransaction = (id: string) => this.pool.get(id);

  getUnconfirmedTransactionList = () => this.pool.getUnconfirmed();

  removeUnconfirmedTransaction = (id: string) => this.pool.remove(id);

  hasUnconfirmed = (id: string) => this.pool.has(id);

  clearUnconfirmed = () => this.pool.clear();

  getUnconfirmedTransactions = (cb) => setImmediate(
    cb, null,
    { transactions: this.getUnconfirmedTransactionList() },
  )

  getTransactions = (req, cb) => {
    const query = req.body;
    const limit = query.limit ? Number(query.limit) : 100;
    const offset = query.offset ? Number(query.offset) : 0;
    const condition: { senderId?: any; type?: any; } = {};
    if (query.senderId) {
      condition.senderId = query.senderId;
    }
    if (query.type) {
      condition.type = Number(query.type);
    }

    (async () => {
      try {
        const count = await global.app.sdb.count('Transaction', condition)
        let transactions = await global.app.sdb.find('Transaction', condition, { limit, offset })
        if (!transactions) transactions = []
        return cb(null, { transactions, count })
      } catch (e) {
       global.app.logger.error('Failed to get transactions', e)
        return cb(`System error: ${e}`)
      }
    })();
  }

  getTransaction = (req, cb) => {
    (async () => {
      try {
        if (!req.params || !req.params.id) return cb('Invalid transaction id')
        const id = req.params.id
        const trs = await global.app.sdb.find('Transaction', { id })
        if (!trs || !trs.length) return cb('Transaction not found')
        return cb(null, { transaction: trs[0] })
      } catch (e) {
        return cb(`System error: ${e}`);
      }
    })();
  }

  applyTransactionsAsync = async (transactions) => {
    for (let i = 0; i < transactions.length; ++i) {
      await this.applyUnconfirmedTransactionAsync(transactions[i]);
    }
  }

  processUnconfirmedTransactions = (transactions, cb) => {
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
  }

  processUnconfirmedTransactionsAsync = async (transactions) => {
    for (const transaction of transactions) {
      await this.processUnconfirmedTransactionAsync(transaction);
    }
  }

  processUnconfirmedTransaction = (transaction, cb) => {
    (async () => {
      try {
        await this.processUnconfirmedTransactionAsync(transaction);
        cb(null, transaction);
      } catch (e) {
        cb(e.toString(), transaction);
      }
    })();
  }

  processUnconfirmedTransactionAsync = async (transaction) => {
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
      const exists = await global.app.sdb.exists('Transaction', { id: transaction.id })
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
  }

  applyUnconfirmedTransactionAsync = async (transaction) => {
    this.library.logger.debug('apply unconfirmed trs', transaction);

    const height = this.modules.blocks.getLastBlock().height;
    const block = {
      height: height + 1,
    };

    const senderId = transaction.senderId;
    const requestorId = transaction.requestorId;
    if (!senderId) {
      throw new Error('Missing sender address');
    }

    const mode = transaction.mode;
    if (transactionMode.isRequestMode(mode)) {
      if (!requestorId) throw new Error('No requestor provided');
      if (requestorId === senderId) throw new Error('Sender should not be equal to requestor');
      if (!transaction.senderPublicKey) throw new Error('Requestor public key not provided');
    } else if (transactionMode.isDirectMode(mode)) {
      if (requestorId) throw new Error('RequestId should not be provided');
      // HARDCODE_HOT_FIX_BLOCK_6119128
      // if (height > 6119128 &&
      //     global.app.util.address.isAddress(senderId) &&
      //     !transaction.senderPublicKey) {
      if (global.app.util.address.isAddress(senderId)
        && !transaction.senderPublicKey) {
        throw new Error('Sender public key not provided');
      }
    } else {
      throw new Error('Unexpected transaction mode');
    }

    let requestor = null
    let sender = await global.app.sdb.load('Account', senderId)
    if (!sender) {
      if (height > 0) throw new Error('Sender account not found')
      sender = global.app.sdb.create('Account', {
        address: senderId,
        name: null,
        gny: 0,
      })
    }

    if (requestorId) {
      if (!global.app.util.address.isAddress(requestorId)) {
        throw new Error('Invalid requestor address')
      }

      requestor = await global.app.sdb.load('Account', requestorId)
      if (!requestor) {
        throw new Error('Requestor account not found');
      }
    } else {
      requestor = sender;
    }

    if (transaction.senderPublicKey) {
      const signerId = transaction.requestorId || transaction.senderId
      let generatedAddress = addressHelper.generateAddress(transaction.senderPublicKey)
      if (generatedAddress !== signerId) {
        throw new Error('Invalid senderPublicKey')
      }
    }

    const context = {
      trs: transaction,
      block,
      sender,
      requestor,
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
  }

  addTransactionUnsigned = (transaction, cb) => {
    this.shared.addTransactionUnsigned({ body: transaction }, cb);
  }

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope
  }
}