import { NewBlockMessage } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isNewBlockMessage(body: any): body is NewBlockMessage {
  const schema = joi.object({
    id: joi
      .string()
      .hex()
      .required(),
    height: joi
      .string()
      .positiveOrZeroBigInt()
      .required(),
    prevBlockId: joi
      .string()
      .hex()
      .required(),
  });
  const report = joi.validate(body, schema);
  if (report.error) {
    return false;
  }

  return true;
}
