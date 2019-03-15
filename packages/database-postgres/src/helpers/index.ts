import { isString, isNumber } from 'util';
import { getConnection } from 'typeorm';

export function toArray(arr) {
  if (Array.isArray(arr)) {
    const i = 0;
    const arr2 = Array(arr.length);
    for (; i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  } else {
    return Array.from(arr);
  }
}

// export type ResolvedEntityKey<E> = {
//   isPrimaryKey?: boolean;
//   isUniqueKey?: boolean;
//   uniqueName: string;
//   key: NormalizedEntityKey<E>;
// };


export function resolveKey(table, key) {

  const primaryKeys = getConnection().getRepository(table).metadata.primaryColumns;
  if (primaryKeys.length !== 1) {
    throw new Error('only one primary key allowed');
  }

  const result = {
    isPrimaryKey: true,
    uniqueName: '__PrimaryKey__',
  };

  if (isString(key) || isNumber(key)) {
    Object.assign(result, { key });
  } else {
    key = JSON.stringify(key);
    Object.assign(result, { key });
  }

  return result;
}
