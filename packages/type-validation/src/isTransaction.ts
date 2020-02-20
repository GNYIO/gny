import { ITransaction } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isTransaction(transaction: any): transaction is ITransaction {
  // property height is required
  const schema = joi.object().keys({
    fee: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    type: joi
      .number()
      .integer()
      .min(0)
      .required(),
    timestamp: joi
      .number()
      .integer()
      .min(0)
      .required(),
    args: joi.array().optional(),
    message: joi.transactionMessage(),
    senderId: joi
      .string()
      .address()
      .required(),
    senderPublicKey: joi
      .string()
      .publicKey()
      .required(),
    signatures: joi
      .array()
      .length(1)
      .items(
        joi
          .string()
          .signature()
          .required()
      )
      .required()
      .single(),
    secondSignature: joi
      .string()
      .signature()
      .optional(),
    id: joi
      .string()
      .hex()
      .required(),
    height: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    _version_: joi
      .number()
      .positive()
      .optional(),
  });

  const report = joi.validate(transaction, schema);
  if (report.error) {
    return false;
  }

  return true;
}
