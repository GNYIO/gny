import { UnconfirmedTransaction } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isUnconfirmedTransaction(
  unconfirmed: any
): unconfirmed is UnconfirmedTransaction {
  // property height NOT allowed
  const schema = joi
    .object()
    .keys({
      fee: joi
        .string()
        .fee(unconfirmed && unconfirmed.type >= 0 ? unconfirmed.type : -1)
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
    })
    .required();

  const report = joi.validate(unconfirmed, schema);
  if (report.error) {
    return false;
  }

  return true;
}
