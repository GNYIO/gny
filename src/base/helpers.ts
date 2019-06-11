import { cloneDeep } from 'lodash';

export function copyObject<T>(obj: T) {
  return cloneDeep<T>(obj);
}
