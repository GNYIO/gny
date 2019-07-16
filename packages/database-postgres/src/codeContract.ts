export type CheckResult = {
  result: boolean;
  message: undefined | string;
};

export function verify(
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

export function argument(name: string, check: () => CheckResult);
export function argument(name: string, check: boolean, errorMsg: string);
export function argument(
  name: string,
  check: (() => CheckResult) | boolean,
  errorMsg?: string
) {
  if (!name) {
    throw new Error('argName can not be null or undefined');
  }
  if (typeof check === 'boolean') {
    verify(check, errorMsg);
  } else {
    const obj = check();
    verify(obj.result, "argument '" + name + "' " + obj.message);
  }
}

export function notNull(data: any) {
  const boolExpression = data !== null && data !== undefined;
  const result: CheckResult = {
    result: boolExpression,
    message: boolExpression ? undefined : 'cannot be null or undefined',
  };
  return result;
}

export function notNullOrEmpty(data: any) {
  const booleanExpression = notNull(data).result === true && data !== '';
  return {
    result: booleanExpression,
    message: booleanExpression
      ? undefined
      : 'cannot be null or undefined or empty',
  };
}

export function notNullOrWhitespace(data: any) {
  const request = notNullOrEmpty(data).result === true && data.trim() !== '';
  const checkResult: CheckResult = {
    result: request,
    message: request ? undefined : 'cannot be null or undefined or whitespace',
  };
  return checkResult;
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
  argument('iterable', () => notNull(iterable));
  argument('getKey', () => notNull(getKey));
  argument('getValue', () => notNull(getValue));

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
 * @param {string[]} keysOrKeyFilter - A list of properties to copy off source. Example ['gny', 'address', 'isDelegate']
 * @param {Object} [target] - Optional target property
 * @return {Object}
 */
export function partialCopy(
  source: Object,
  keysOrKeyFilter: string[] | ((a: any) => boolean),
  target?: Object
) {
  argument('source', () => notNull(source));
  argument('keysOrKeyFilter', () => notNull(keysOrKeyFilter));

  const newValues =
    typeof keysOrKeyFilter === 'function'
      ? Object.keys(source).filter(keysOrKeyFilter)
      : keysOrKeyFilter;
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
