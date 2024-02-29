import { BlockIdWrapper } from '@gnyio/interfaces';
import { joi } from '@gnyio/extended-joi';

export function isBlockIdWrapper(
  blockIdWrapper: any
): blockIdWrapper is BlockIdWrapper {
  const schema = joi
    .object()
    .keys({
      id: joi
        .string()
        .hex()
        .required(),
    })
    .required();

  const report = joi.validate(blockIdWrapper, schema);
  if (report.error) {
    return false;
  }
  return true;
}
