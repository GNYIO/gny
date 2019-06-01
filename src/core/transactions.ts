import { LimitCache } from '../utils/limit-cache';
import { TransactionPool } from '../utils/transaction-pool';
import { Modules, IScope, Transaction, Context, IState } from '../interfaces';
import { TransactionBase } from '../base/transaction';

export default class Transactions {
  private readonly library: IScope;
  private modules: Modules;
  private pool: TransactionPool;
  private failedTrsCache: LimitCache<string, boolean>;

  constructor(scope: IScope) {
    this.library = scope;
    this.pool = new TransactionPool();
    this.failedTrsCache = new LimitCache<string, boolean>();
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

  applyTransactionsAsync = async (transactions: Transaction[]) => {
    for (let i = 0; i < transactions.length; ++i) {
      await this.applyUnconfirmedTransactionAsync(transactions[i]);
    }
  };

  public processUnconfirmedTransactions = (
    state: IState,
    transactions: Transaction[],
    cb
  ) => {
    (async () => {
      try {
        for (const transaction of transactions) {
          await this.processUnconfirmedTransactionAsync(state, transaction);
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

  processUnconfirmedTransaction = (
    state: IState,
    transaction: Transaction,
    cb
  ) => {
    (async () => {
      try {
        await this.processUnconfirmedTransactionAsync(state, transaction);
        cb(null, transaction);
      } catch (e) {
        cb(e.toString(), transaction);
      }
    })();
  };

  processUnconfirmedTransactionAsync = async (
    state: IState,
    transaction: Transaction
  ) => {
    try {
      if (!transaction.id) {
        transaction.id = TransactionBase.getId(transaction);
      } else {
        const id = TransactionBase.getId(transaction);
        if (transaction.id !== id) {
          throw new Error('Invalid transaction id');
        }
      }

      if (state.privIsCollectingVotes) {
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
      await this.applyUnconfirmedTransactionAsync(state, transaction);
      this.pool.add(transaction);
      return transaction;
    } catch (e) {
      this.failedTrsCache.set(transaction.id, true);
      throw e;
    }
  };

  public applyUnconfirmedTransactionAsync = async (
    state: IState,
    transaction: Transaction
  ) => {
    this.library.logger.debug('apply unconfirmed trs', transaction);

    const height = state.lastBlock.height;
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

    const context: Context = {
      trs: transaction,
      block,
      sender,
    };
    if (height > 0) {
      const error = await TransactionBase.verify(context);
      if (error) throw new Error(error);
    }

    try {
      global.app.sdb.beginContract();
      await this.apply(context);
      global.app.sdb.commitContract();
    } catch (e) {
      global.app.sdb.rollbackContract();
      this.library.logger.error(e);
      throw e;
    }
  };

  public async apply(context: Context) {
    const { block, trs, sender } = context;
    const name = global.app.getContractName(String(trs.type));
    if (!name) {
      throw new Error(`Unsupported transaction type: ${trs.type}`);
    }
    const [mod, func] = name.split('.');
    if (!mod || !func) {
      throw new Error('Invalid transaction function');
    }
    const fn = global.app.contract[mod][func];
    if (!fn) {
      throw new Error('Contract not found');
    }

    if (block.height !== 0) {
      if (sender.gny < trs.fee) throw new Error('Insufficient sender balance');
      sender.gny -= trs.fee;
      await global.app.sdb.update(
        'Account',
        { gny: sender.gny },
        { address: sender.address }
      );
    }

    const error = await fn.apply(context, trs.args);
    if (error) {
      throw new Error(error);
    }
    // transaction.executed = 1
    return null;
  }

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope;
  };
}
