import { BlocksWrapperParams } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isBlocksWrapperParams(
  params: any
): params is BlocksWrapperParams {
  const schema = joi.object().keys({
    limit: joi
      .number()
      .integer()
      .min(0)
      .max(200)
      .optional(),
    lastBlockId: joi
      .string()
      .hex()
      .required(),
  });
  const report = joi.validate(params, schema);
  if (report.error) {
    return false;
  }

  return true;
}
