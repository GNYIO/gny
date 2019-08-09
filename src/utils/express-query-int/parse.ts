export default function parseNums(obj, options) {
  const result = {};
  let key;
  let value;

  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      value = obj[key];

      if (typeof value === 'string' && !isNaN(options.parser(value, 10, key))) {
        result[key] = options.parser(value, 10, key);
      } else if (value.constructor === Object) {
        result[key] = parseNums(value, options);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}
