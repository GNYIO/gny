import pkg from 'lodash';
const { cloneDeep } = pkg;

export function copyObject<T>(obj: T) {
  return cloneDeep<T>(obj);
}
