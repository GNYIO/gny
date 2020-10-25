import { HeightWrapper } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isHeightWrapper(
  heightWrapper: any
): heightWrapper is HeightWrapper {
  const schema = joi
    .object()
    .keys({
      height: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
    })
    .required();

  const report = joi.validate(heightWrapper, schema);
  if (report.error) {
    return false;
  }
  return true;
}
