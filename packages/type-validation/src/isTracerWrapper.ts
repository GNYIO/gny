import { TracerWrapper } from '@gnyio/interfaces';
import { joi } from '@gnyio/extended-joi';

export function isTracerWrapper<T>(wrapper: any): wrapper is TracerWrapper<T> {
  const schema = joi
    .object({
      spanId: joi
        .object({
          'uber-trace-id': joi.string().required(),
        })
        .required(),
      data: joi.any().required(),
    })
    .required();

  const report = joi.validate(wrapper, schema);
  if (report.error) {
    return false;
  }
  return true;
}
