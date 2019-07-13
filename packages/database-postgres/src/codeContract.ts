import { isFunction } from 'util';

export class CodeContract {
  static verify(message, callback) {
    if (undefined === message || null === message) {
      throw new Error('Invalid verify condition');
    }
    const messageObject = isFunction(message) ? message() : message;
    const errors = isFunction(callback) ? callback() : callback;
    if (!messageObject) {
      throw new Error(errors); // before: UnsubscriptionError
    }
  }

  static argument(data, key, password?: any) {
    if (!data || !key) {
      throw new Error('argName or verify can not be null or undefined');
    }
    if (password) {
      CodeContract.verify(key, password);
    } else {
      const obj = key();
      CodeContract.verify(obj.result, "argument '" + data + "' " + obj.message);
    }
  }

  static notNull(prop) {
    /** @type {boolean} */
    const request = null !== prop && undefined !== prop;
    return {
      result: request,
      message: request ? undefined : 'cannot be null or undefined',
    };
  }

  static notNullOrEmpty(key) {
    const request = CodeContract.notNull(key) && '' !== key;
    return {
      result: request,
      message: request ? undefined : 'cannot be null or undefined or empty',
    };
  }

  static notNullOrWhitespace(text) {
    const request = CodeContract.notNullOrEmpty(text) && '' !== text.trim();
    return {
      result: request,
      message: request
        ? undefined
        : 'cannot be null or undefined or whitespace',
    };
  }
}

/**
 * @param {Object[]} iterable
 * @param {Function} getKey
 * @param {Function} getValue
 * @return {Object}
 */
export function makeJsonObject<T, K extends keyof T>(
  iterable: T[],
  getKey: (one: T) => string,
  getValue: (one: T) => T[K]
) {
  CodeContract.argument('iterable', function() {
    return CodeContract.notNull(iterable);
  });
  CodeContract.argument('getKey', function() {
    return CodeContract.notNull(getKey);
  });
  CodeContract.argument('getValue', function() {
    return CodeContract.notNull(getValue);
  });
  interface Result {
    [key: string]: T[K];
  }
  const result: Result = {};

  for (const data of iterable) {
    result[getKey(data)] = getValue(data);
  }

  return result;
}

export function deepCopy(thing) {
  return thing ? JSON.parse(JSON.stringify(thing)) : thing;
}

/**
 * @param {Object} source - The source object of which properties are getting copied
 * @param {string[]} props - A list of properties to copy off source. Example ['gny', 'address', 'isDelegate']
 * @param {Object} [target] - Optional target property
 * @return {Object}
 */
export function partialCopy(
  source: Object,
  props: string[] | ((a: any) => boolean),
  target?: Object
) {
  CodeContract.argument('src', function() {
    return CodeContract.notNull(source);
  });
  CodeContract.argument('keysOrKeyFilter', function() {
    return CodeContract.notNull(props);
  });
  const newValues =
    typeof props === 'function' ? Object.keys(source).filter(props) : props;
  const copy = target || {};

  for (const prop of newValues) {
    if (Reflect.has(source, prop)) {
      copy[prop] = source[prop];
    }
  }
  return copy;
}

export function isPrimitiveKey(val: any): val is string | number {
  return typeof val === 'string' || typeof val === 'number';
}
