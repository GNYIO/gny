const { isFunction, isString, isNumber } = require('util');


export class CodeContract {
  static verify(message, callback) {
    if (undefined === message || null === message) {
      throw new Error("Invalid verify condition");
    }
    const messageObject = isFunction(message) ? message() : message;
    const errors = isFunction(callback) ? callback() : callback;
    if (!messageObject) {
      throw new Error(errors); // before: UnsubscriptionError
    }
  }

  static argument(data, key, password?: any) {
    if (!data || !key) {
      throw new Error("argName or verify can not be null or undefined");
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
      result : request,
      message : request ? undefined : "cannot be null or undefined"
    };
  }

  static notNullOrEmpty(key) {
    const request = CodeContract.notNull(key) && "" !== key;
    return {
      result : request,
      message : request ? undefined : "cannot be null or undefined or empty"
    };
  }

  static notNullOrWhitespace(text) {
    const request = CodeContract.notNullOrEmpty(text) && "" !== text.trim();
    return {
      result : request,
      message : request ? undefined : "cannot be null or undefined or whitespace"
    };
  }
}

/**
 * @param {?} value
 * @param {!Function} store
 * @param {!Function} action
 * @return {?}
 */
export function makeJsonObject(value, store, action) {
  CodeContract.argument("iterable", function() {
    return CodeContract.notNull(value);
  });
  CodeContract.argument("getKey", function() {
    return CodeContract.notNull(store);
  });
  CodeContract.argument("getValue", function() {
    return CodeContract.notNull(action);
  });
  const dataArray = {};
  /** @type {boolean} */
  const _iteratorNormalCompletion3 = true;
  /** @type {boolean} */
  var _didIteratorError = false;
  var _iteratorError = undefined;
  try {
    var _iterator3 = value[Symbol.iterator]();
    var _step2;
    for (; !(_iteratorNormalCompletion3 = (_step2 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var data = _step2.value;
      dataArray[store(data)] = action(data);
    }
  } catch (err) {
    /** @type {boolean} */
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
  return dataArray;
}


export function deepCopy(thing) {
  return thing ? JSON.parse(JSON.stringify(thing)) : thing;
}


/**
 * @param {!Object} obj
 * @param {!Array} value
 * @param {number} test
 * @return {?}
 */
export function partialCopy(source, props, target) {
  CodeContract.argument("src", function() {
    return CodeContract.notNull(source);
  });
  CodeContract.argument("keysOrKeyFilter", function() {
    return CodeContract.notNull(props);
  });
  var newValues = isFunction(props) ? Object.keys(source).filter(props) : props;
  var copy = target || {};
  /** @type {boolean} */
  var _iteratorNormalCompletion3 = true;
  /** @type {boolean} */
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;
  try {
    var _iterator3 = newValues[Symbol.iterator]();
    var _step2;
    for (; !(_iteratorNormalCompletion3 = (_step2 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var prop = _step2.value;
      if (Reflect.has(source, prop)) {
        copy[prop] = source[prop];
      }
    }
  } catch (err) {
    /** @type {boolean} */
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }
  return copy;
}


export function isPrimitiveKey(str) {
  return !!str && (isString(str) || isNumber(str));
}

export class NotImplementError extends Error {
  constructor(props) {
    super(props);
  }
}

