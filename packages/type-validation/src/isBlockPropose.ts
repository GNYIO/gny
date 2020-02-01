import { BlockPropose } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isBlockPropose(propose: any): propose is BlockPropose {
  const schema = joi.object().keys({
    address: joi
      .string()
      .ipv4PlusPort()
      .required(),
    generatorPublicKey: joi
      .string()
      .hex()
      .required(),
    hash: joi
      .string()
      .hex()
      .required(),
    height: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    id: joi
      .string()
      .hex()
      .required(),
    signature: joi
      .string()
      .hex()
      .required(),
    timestamp: joi
      .number()
      .integer()
      .positive()
      .required(),
  });
  const report = joi.validate(propose, schema);
  if (report.error) {
    return false;
  }
  return true;
}
