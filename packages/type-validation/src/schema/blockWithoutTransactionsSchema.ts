import { joi } from '@gny/extended-joi';

export const blockWithoutTransactionsSchema: any = joi
  .object()
  .keys({
    id: joi.string(),
    height: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    version: joi
      .number()
      .integer()
      .min(0)
      .required(),
    timestamp: joi
      .number()
      .integer()
      .min(0)
      .required(),
    prevBlockId: joi
      .string()
      .allow(null)
      .required(),
    count: joi
      .number()
      .integer()
      .min(0)
      .required(),
    fees: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    reward: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    payloadHash: joi
      .string()
      .hex()
      .required(),
    delegate: joi
      .string()
      .publicKey()
      .required(),
    signature: joi
      .string()
      .signature()
      .required(),
  })
  .required();
