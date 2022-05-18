import { IBlockWithoutTransactions } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';
import { blockWithoutTransactionsSchema } from './schema/blockWithoutTransactionsSchema';

export function isBlockWithoutTransactions(
  blockWithoutTransactions: any
): blockWithoutTransactions is IBlockWithoutTransactions {
  const schema = blockWithoutTransactionsSchema;

  const report = joi.validate(blockWithoutTransactions, schema);
  if (report.error) {
    console.log(`isBlockWithoutTransactions: ${report.error.message}`);
    return false;
  }

  return true;
}
