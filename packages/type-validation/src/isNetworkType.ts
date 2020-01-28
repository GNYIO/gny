import { NetworkType } from '@gny/interfaces';
import { joi } from '@gny/extendedJoi';

export function isNetworkType(networkType: any): networkType is NetworkType {
  const schema = joi
    .string()
    .networkType()
    .required();

  const report = joi.validate(networkType, schema);
  if (report.error) {
    return false;
  }

  return true;
}
