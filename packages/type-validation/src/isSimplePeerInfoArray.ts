import { SimplePeerInfo } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isSimplePeerInfoArray(peers: any): peers is SimplePeerInfo[] {
  const simplePeerInfoSchema = joi
    .array()
    .items({
      id: joi
        .object()
        .keys({
          id: joi.string().required(),
          pubKey: joi
            .string()
            .allow(null)
            .required(),
        })
        .required(),
      multiaddrs: joi
        .array()
        .items(joi.string().required())
        .length(1)
        .required(),
      simple: joi
        .object()
        .keys({
          host: joi
            .string()
            .ip()
            .required(),
          port: joi
            .number()
            .integer()
            .port()
            .required(),
        })
        .required(),
    })
    .required();
  const simplePeerInfoArrayReport = joi.validate(peers, simplePeerInfoSchema);
  if (simplePeerInfoArrayReport.error) {
    return false;
  }
  return true;
}
