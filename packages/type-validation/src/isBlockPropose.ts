import { BlockPropose } from '@gnyio/interfaces';
import { joi } from '@gnyio/extended-joi';

export function isBlockPropose(propose: any): propose is BlockPropose {
  const schema = joi
    .object()
    .keys({
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

      // TODO: write unit tests
      // has always a value, because we don't need a BlockPropose for height 0
      prevBlockId: joi
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
    })
    .required();
  const report = joi.validate(propose, schema);
  if (report.error) {
    return false;
  }
  return true;
}
