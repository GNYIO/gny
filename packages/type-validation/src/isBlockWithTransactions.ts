import { IBlockWithTransactions } from '@gnyio/interfaces';
import { joi } from '@gnyio/extended-joi';
import { blockWithTransactionsSchema } from './schema/blockWithTransactionsSchema.js';

export function isBlockWithTransactions(
  blockWithTransaction: any
): blockWithTransaction is IBlockWithTransactions {
  const schema = blockWithTransactionsSchema;

  const report = joi.validate(blockWithTransaction, schema);
  if (report.error) {
    return false;
  }

  return true;
}
