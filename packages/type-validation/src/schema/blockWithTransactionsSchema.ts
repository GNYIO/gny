import { joi } from '@gny/extended-joi';

export const blockWithTransactionsSchema: any = joi.object().keys({
  id: joi.string(),
  height: joi
    .string()
    .positiveOrZeroBigInt()
    .required(),
  signature: joi
    .string()
    .signature()
    .required(),
  delegate: joi
    .string()
    .publicKey()
    .required(),
  payloadHash: joi
    .string()
    .hex()
    .required(),
  payloadLength: joi
    .number()
    .integer()
    .min(0),
  prevBlockId: joi.string(),
  timestamp: joi
    .number()
    .integer()
    .min(0)
    .required(),
  transactions: joi.array().required(),
  version: joi
    .number()
    .integer()
    .min(0)
    .required(),
  reward: joi
    .string()
    .positiveOrZeroBigInt()
    .required(),
  fees: joi
    .string()
    .positiveOrZeroBigInt()
    .required(),
  count: joi
    .number()
    .integer()
    .min(0)
    .required(),
});
