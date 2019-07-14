export type CheckResult = {
  result: boolean;
  message: undefined | string;
};

export class CodeContract {
  static verify(
    expression: (() => boolean) | boolean,
    errorMsg: (() => string) | string
  ) {
    if (undefined === expression || null === expression) {
      throw new Error('Invalid verify condition');
    }
    const messageObject =
      typeof expression === 'function' ? expression() : expression;
    const errors = typeof errorMsg === 'function' ? errorMsg() : errorMsg;
    if (!messageObject) {
      throw new Error(errors);
    }
  }

  static argument(data: any, check: () => CheckResult, errorMsg?: string) {
    if (!data || !check) {
      throw new Error('argName or verify can not be null or undefined');
    }
    if (errorMsg) {
      CodeContract.verify(check, errorMsg);
    } else {
      const obj = check();
      CodeContract.verify(obj.result, "argument '" + data + "' " + obj.message);
    }
  }

  static notNull(data: any) {
    const boolExpression = data !== null && data !== undefined;
    const result: CheckResult = {
      result: boolExpression,
      message: boolExpression ? undefined : 'cannot be null or undefined',
    };
    return result;
  }

  static notNullOrEmpty(data: any) {
    const booleanExpression =
      CodeContract.notNull(data).result === true && data !== '';
    return {
      result: booleanExpression,
      message: booleanExpression
        ? undefined
        : 'cannot be null or undefined or empty',
    };
  }

  static notNullOrWhitespace(data: any) {
    const request =
      CodeContract.notNullOrEmpty(data).result === true && data.trim() !== '';
    const checkResult: CheckResult = {
      result: request,
      message: request
        ? undefined
        : 'cannot be null or undefined or whitespace',
    };
    return checkResult;
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
