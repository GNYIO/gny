import { ManyVotes } from '@gnyio/interfaces';
import { joi } from '@gnyio/extended-joi';

export function isManyVotes(manyVotes: any): manyVotes is ManyVotes {
  const schema = joi
    .object()
    .keys({
      height: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      id: joi
        .string()
        .length(64)
        .hex()
        .required(),
      signatures: joi
        .array()
        .items({
          publicKey: joi
            .string()
            .publicKey()
            .required(),
          signature: joi
            .string()
            .signature()
            .required(),
        })
        .required(),
    })
    .required();

  const report = joi.validate(manyVotes, schema);
  if (report.error) {
    return false;
  }

  return true;
}
