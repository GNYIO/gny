import { ITransaction } from '@gny/interfaces';
import { joi } from '@gny/extendedJoi';

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
    message: joi
      .string()
      .max(256)
      .alphanum()
      .allow('')
      .optional(),
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
  });

  const report = joi.validate(transaction, schema);
  if (report.error) {
    return false;
  }

  return true;
}
