import { CommonBlockParams } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isCommonBlockParams(
  commonBlock: any
): commonBlock is CommonBlockParams {
  const schema = joi.object().keys({
    max: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    min: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    ids: joi
      .array()
      .items(
        joi
          .string()
          .hex()
          .required()
      )
      .min(1)
      .required(),
  });
  const report = joi.validate(commonBlock, schema);
  if (report.error) {
    return false;
  }
  return true;
}
