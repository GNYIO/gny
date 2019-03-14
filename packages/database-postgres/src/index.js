
const smartDB = require('./smartDB');
const { ModelSchema } = require('./fieldTypes');
const { LogManager, } = require('./logger');

const SmartDB = {
  SmartDB: smartDB.SmartDB,
  ModelSchema,
  LogManager,
};

module.exports = {
  SmartDB,
};
