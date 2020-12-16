import {
  ITransaction,
  Context,
  IAccount,
  ICoreModule,
  UnconfirmedTransaction,
} from '@gny/interfaces';
import { IState } from '../globalInterfaces';
import { TransactionBase } from '@gny/base';
import { StateHelper } from './StateHelper';
import { BigNumber } from 'bignumber.js';
import { Account } from '@gny/database-postgres';
import { Transaction } from '@gny/database-postgres';
import { isAddress } from '@gny/utils';
import { ISpan } from '@gny/tracer';

export default class Transactions implements ICoreModule {
  public static processUnconfirmedTransactionsAsync = async (
    state: IState,
    transactions: Array<UnconfirmedTransaction>,
    parentSpan: ISpan
  ) => {
    for (const transaction of transactions) {
      const span = global.library.tracer.startSpan(
        'process multiple transactions',
        {
          childOf: parentSpan.context(),
        }
      );
      span.setTag('transactionId', transaction.id);
      span.setTag('senderId', transaction.senderId);

      try {
        await Transactions.processUnconfirmedTransactionAsync(
          state,
          transaction,
          span
        );
      } catch (err) {
        span.setTag('error', true);
        span.log({
          value: `error during processing transaction: ${err.message}`,
        });
        span.finish();

        throw err;
      }
    }
  };

  public static processUnconfirmedTransactionAsync = async (
    state: IState,
    transaction: UnconfirmedTransaction,
    span: ISpan
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
      const exists = await global.app.sdb.exists<Transaction>(Transaction, {
        id: transaction.id,
      });
      if (exists) {
        throw new Error('Transaction already confirmed');
      }
      await Transactions.applyUnconfirmedTransactionAsync(
        state,
        transaction,
        span
      );
      StateHelper.AddUnconfirmedTransactions(transaction);
      return transaction;
    } catch (e) {
      // span.setTag('error', true);
      span.log({
        value: `error: ${e.message}`,
      });

      StateHelper.AddFailedTrs(transaction.id);
      throw e;
    }
  };

  public static applyUnconfirmedTransactionAsync = async (
    state: IState,
    transaction: ITransaction | UnconfirmedTransaction,
    parentSpan: ISpan
  ) => {
    const span = global.library.tracer.startSpan(
      'apply unconfirmed transaction',
      {
        childOf: parentSpan.context(),
      }
    );
    span.setTag('transactionId', transaction.id);
    span.setTag('senderId', transaction.senderId);

    const height = state.lastBlock.height;
    const block = {
      height: new BigNumber(height).plus(1).toFixed(),
    };

    const senderId = transaction.senderId;
    if (!senderId) {
      span.setTag('error', true);
      span.log({
        value: 'Missing sender address',
      });
      span.finish();

      throw new Error('Missing sender address');
    }
    if (isAddress(senderId) && !transaction.senderPublicKey) {
      span.setTag('error', true);
      span.log({
        value: 'Sender public key not provided',
      });
      span.finish();

      throw new Error('Sender public key not provided');
    }

    let sender = await global.app.sdb.load<Account>(Account, {
      address: senderId,
    });
    if (!sender) {
      if (new BigNumber(height).isGreaterThan(0)) {
        span.setTag('error', true);
        span.log({
          value: 'Sender account not found',
        });
        span.finish();

        throw new Error('Sender account not found');
      }
      sender = await global.app.sdb.create<Account>(Account, {
        address: senderId,
        username: null,
        gny: String(0),
      } as IAccount);
    }

    const context: Context = {
      trs: transaction,
      block,
      sender,
    };
    if (new BigNumber(height).isGreaterThan(0)) {
      const error = await TransactionBase.verify(context);
      if (error) {
        span.setTag('error', true);
        span.log({
          value: `error during verifying trs context: ${error}`,
        });
        span.finish();

        throw new Error(error);
      }
    }

    try {
      global.app.sdb.beginContract();
      await Transactions.apply(context);
      global.app.sdb.commitContract();

      span.finish();
    } catch (e) {
      span.setTag('error', true);
      span.log({
        value: `error during applying transaction: ${e}`,
      });
      span.log({
        value: 'going to rollback contract',
      });
      span.finish();

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

    if (!new BigNumber(block.height).isEqualTo(0)) {
      if (new BigNumber(sender.gny).isLessThan(trs.fee))
        throw new Error('Insufficient sender balance');
      sender.gny = new BigNumber(sender.gny).minus(trs.fee).toFixed();
      await global.app.sdb.update<Account>(
        Account,
        { gny: String(sender.gny) },
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
