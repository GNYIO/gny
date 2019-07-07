import { Transaction, Context, IState, IAccount } from '../interfaces';
import { TransactionBase } from '../base/transaction';
import { StateHelper } from './StateHelper';
import { BigNumber } from 'bignumber.js';

export default class Transactions {
  public static processUnconfirmedTransactions = (
    state: IState,
    transactions: Transaction[],
    cb
  ) => {
    (async () => {
      try {
        for (const transaction of transactions) {
          await Transactions.processUnconfirmedTransactionAsync(
            state,
            transaction
          );
        }
        cb(null, transactions);
      } catch (e) {
        cb(e.toString(), transactions);
      }
    })();
  };

  public static processUnconfirmedTransactionsAsync = async (
    state: IState,
    transactions: Transaction[]
  ) => {
    for (const transaction of transactions) {
      await Transactions.processUnconfirmedTransactionAsync(state, transaction);
    }
  };

  public static processUnconfirmedTransaction = (
    state: IState,
    transaction: Transaction,
    cb
  ) => {
    (async () => {
      try {
        await Transactions.processUnconfirmedTransactionAsync(
          state,
          transaction
        );
        cb(null, transaction);
      } catch (e) {
        cb(e.toString(), transaction);
      }
    })();
  };

  public static processUnconfirmedTransactionAsync = async (
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

      if (StateHelper.TrsAlreadyFailed(transaction.id)) {
        throw new Error('Transaction already processed');
      }
      if (StateHelper.TrsAlreadyInUnconfirmedPool(transaction.id)) {
        throw new Error('Transaction already in the pool');
      }
      const exists = await global.app.sdb.exists('Transaction', {
        id: transaction.id,
      });
      if (exists) {
        throw new Error('Transaction already confirmed');
      }
      await Transactions.applyUnconfirmedTransactionAsync(state, transaction);
      StateHelper.AddUnconfirmedTransactions(transaction);
      return transaction;
    } catch (e) {
      StateHelper.AddFailedTrs(transaction.id);
      throw e;
    }
  };

  public static applyUnconfirmedTransactionAsync = async (
    state: IState,
    transaction: Transaction
  ) => {
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
        gny: new BigNumber(0),
      } as IAccount);
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
      await Transactions.apply(context);
      global.app.sdb.commitContract();
    } catch (e) {
      global.app.sdb.rollbackContract();
      throw e;
    }
  };

  public static async apply(context: Context) {
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
      if (new BigNumber(sender.gny).isLessThan(trs.fee))
        throw new Error('Insufficient sender balance');
      sender.gny = new BigNumber(sender.gny).minus(trs.fee);
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
}
