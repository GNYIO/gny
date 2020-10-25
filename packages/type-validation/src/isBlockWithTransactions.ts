import { IBlockWithTransactions } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';
import { blockWithTransactionsSchema } from './schema/blockWithTransactionsSchema';

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
