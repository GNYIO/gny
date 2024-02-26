import { CommonBlockResult } from '@gnyio/interfaces';
import { joi } from '@gnyio/extended-joi';
import { blockWithoutTransactionsSchema } from './schema/blockWithoutTransactionsSchema.js';

export function isCommonBlockResult(
  commonBlockResult: any
): commonBlockResult is CommonBlockResult {
  const schema = joi
    .object()
    .keys({
      commonBlock: blockWithoutTransactionsSchema.required(),
      currentBlock: blockWithoutTransactionsSchema.required(),
    })
    .required();

  const report = joi.validate(commonBlockResult, schema);
  if (report.error) {
    console.log(
      `isCommonBlockResult: ${
        report.error.message
      }, input was: ${JSON.stringify(commonBlockResult)}`
    );
    return false;
  }

  return true;
}
