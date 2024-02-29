import { BlockAndVotes } from '@gnyio/interfaces';
import { joi } from '@gnyio/extended-joi';
import { blockWithTransactionsSchema } from './schema/blockWithTransactionsSchema.js';

export function isBlockAndVotes(
  blockAndVotes: any
): blockAndVotes is BlockAndVotes {
  const schema = joi
    .object()
    .keys({
      votes: joi
        .string()
        .base64()
        .required(),
      block: blockWithTransactionsSchema.required(),
    })
    .required();

  const report = joi.validate(blockAndVotes, schema);
  if (report.error) {
    return false;
  }
  return true;
}
