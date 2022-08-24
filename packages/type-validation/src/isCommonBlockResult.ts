import { CommonBlockResult } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';
import { blockWithoutTransactionsSchema } from './schema/blockWithoutTransactionsSchema';

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
