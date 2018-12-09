import parseNums from './parse';

export default function(options) {
  options = options || {
    parser: parseInt
  };

  return function(req, res, next) {
    req.query = parseNums(req.query, options);
    next();
  };
};
