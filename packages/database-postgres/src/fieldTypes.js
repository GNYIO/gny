const { toArray, } = require('./helpers/index');
var { isBoolean, isString, isObject, } = require('util');
var codeContract = require('./codeContract');
var { ENTITY_VERSION_PROPERTY } = require('./entityChangeType');
var lodash = require('lodash');

var res;
var output = {};
!function(exports) {
  /** @type {string} */
  exports.String = "String";
  /** @type {string} */
  exports.Number = "Number";
  /** @type {string} */
  exports.BigInt = "BigInt";
  /** @type {string} */
  exports.Text = "Text";
  /** @type {string} */
  exports.JSON = "Json";
}(res = output.FieldTypes || (output.FieldTypes = {}));

class InvalidEntityKeyError extends Error {
  constructor(context, props) {
    super("Invalid entity key\uff0c( model = " + context + ", key = '" + JSON.stringify(props) + "' ) ");
  }
}

class ModelSchema {
  /**
   * @param {!Object} obj
   * @param {string} name
   * @return {undefined}
   */
  constructor(obj, name) {
    this.schema = lodash.cloneDeep(obj);
    this.name = name;
    this.memory = true === obj.memory;
    this.readonly = true === obj.readonly;
    this.local = true === obj.local;
    this.maxCachedCount = this.memory ? Number.POSITIVE_INFINITY : obj.maxCached;
    this.propertiesSet = new Set;
    this.uniquePropertiesSet = new Set;
    this.attachVersionField();
    this.parseProperties();
  }


  attachVersionField() {
    if (!this.schema.tableFields.some(function(type) {
      return type.name === ENTITY_VERSION_PROPERTY;
    })) {
      this.schema.tableFields.push({
        name : "_version_",
        type : res.Number,
        default : 0
      });
    }
  }

  convertType(url) {
    return url;
  }

  getIndexes(ts, t) {
    var nodes = new Map;

    // TODO: refactor
    return ts.filter(function(extraInjections) {
      return undefined !== extraInjections[t];
    }).forEach(function(data) {
      var target = data[t];
      if (!isBoolean(target) && !isString(target)) {
        throw new Error("index or unique should be true or a valid name");
      }
      var n = data.name;
      if (true === target) {
        nodes.set(data.name, [n]);
      } else {
        if (isString(target)) {
          var a = target;
          if (!nodes.has(a)) {
            nodes.set(a, new Array);
          }
          nodes.get(a).push(n);
        }
      }
    }), [].concat(toArray(nodes.keys())).map(function(func) {
      return {
        name : func,
        properties : nodes.get(func)
      };
    });
  }

  parseNormalIndexes(tobj) {
    return this.getIndexes(tobj.tableFields, "index");
  }

  parseUniqueIndexes(self) {
    return this.getIndexes(self.tableFields, "unique");
  }

  parseProperties() {
    var compiler = this;
    var expRecords = this.schema.tableFields.filter(function(event) {
      return true === event.primary_key;
    }).map(function(engineDiscovery) {
      return engineDiscovery.name;
    });
    if (this.compositKeyProperties = this.schema.tableFields.filter(function(canCreateDiscussions) {
      return true === canCreateDiscussions.composite_key;
    }).map(function(engineDiscovery) {
      return engineDiscovery.name;
    }), this.primaryKeyProperty = 1 === expRecords.length ? expRecords[0] : undefined, !(undefined !== this.primaryKeyProperty != this.compositKeyProperties.length > 1)) {
      throw new Error("model must have primary key or composite keys, but can not both");
    }
    /** @type {!Map} */
    this.allPropertyTypes = new Map;
    this.schema.tableFields.forEach((event) => {
      return compiler.allPropertyTypes.set(event.name, compiler.convertType(event.type));
    });
    this.allProperties = this.schema.tableFields.map(function(engineDiscovery) {
      return engineDiscovery.name;
    });
    this.allJsonProperties = this.schema.tableFields.filter(function(msg) {
      return msg.type === res.JSON;
    }).map(function(engineDiscovery) {
      return engineDiscovery.name;
    });
    this.allNormalIndexes = this.parseNormalIndexes(this.schema);
    this.allUniqueIndexes = this.parseUniqueIndexes(this.schema);
    this.allProperties.forEach(function(e) {
      return compiler.propertiesSet.add(e);
    });
    this.allUniqueIndexes.forEach(function(e) {
      return e.properties.forEach(function(e) {
        return compiler.uniquePropertiesSet.add(e);
      });
    });
  }

  hasUniqueProperty() {
    /** @type {number} */
    var _len8 = arguments.length;
    /** @type {!Array} */
    var args = Array(_len8);
    /** @type {number} */
    var _key8 = 0;
    for (; _key8 < _len8; _key8++) {
      args[_key8] = arguments[_key8];
    }
    return args.some((geomData) => {
      return this.uniquePropertiesSet.has(geomData);
    });
  }

  isValidProperty(typeName) {
    return this.propertiesSet.has(typeName);
  }

  isValidEntityKey(selector) {
    return this.isValidPrimaryKey(selector) || this.isValidUniqueKey(selector);
  }

  isNormalizedPrimaryKey(params) {
    if (!isObject(params)) {
      return;
    }
    var level = params;
    /** @type {!Array<string>} */
    var canvas = Object.keys(level);
    return this.isCompsiteKey ? this.isValidPrimaryKey(level) : 1 === canvas.length && canvas[0] === this.primaryKey;
  }

  setPrimaryKey(val, id) {
    if (!this.isValidPrimaryKey(id)) {
      throw new Error("Invalid PrimaryKey of model '" + this.modelName + "', key=''" + JSON.stringify(id));
    }
    return !this.isCompsiteKey && codeContract.isPrimitiveKey(id) ? val[this.primaryKey] = id : this.isCompsiteKey ? codeContract.partialCopy(id, this.compositeKeys, val) : codeContract.partialCopy(id, [this.primaryKey], val), val;
  }

  getPrimaryKey(val) {
    return this.isCompsiteKey ? codeContract.partialCopy(val, this.compositeKeys) : val[this.primaryKey];
  }

  getNormalizedPrimaryKey(err) {
    return this.isCompsiteKey ? codeContract.partialCopy(err, this.compositeKeys) : codeContract.partialCopy(err, [this.primaryKey]);
  }
  normalizePrimaryKey(result) {
    if (!codeContract.isPrimitiveKey(result)) {
      return result;
    }
    var item = {};
    return item[this.primaryKey] = result, item;
  }
  isValidPrimaryKey(val) {
    return !this.isCompsiteKey && (codeContract.isPrimitiveKey(val) || this.isNormalizedPrimaryKey(val)) || 0 === lodash.xor(Object.keys(val), this.compositeKeys).length;
  }
  isValidUniqueKey(name) {
    return undefined !== this.getUniqueName(name);
  }

  getUniqueName(y) {
    if (this.isValidPrimaryKey(y)) {
      return ModelSchema.PRIMARY_KEY_NAME;
    }
    /** @type {!Array<string>} */
    var col = Object.keys(y);
    if (1 === col.length && col[0] === this.primaryKey) {
      return ModelSchema.PRIMARY_KEY_NAME;
    }
    var value = this.uniqueIndexes.find(function(other) {
      return 0 === lodash.xor(other.properties, col).length;
    });
    return undefined === value ? undefined : value.name;
  }

  isPrimaryKeyUniqueName(callback) {
    return callback === ModelSchema.PRIMARY_KEY_NAME;
  }

  getUniqueIndex(name) {
    return this.allUniqueIndexes.find(function(functionImport) {
      return functionImport.name === name;
    });
  }

  resolveKey(name) {
    var up = this.getUniqueName(name);
    if (undefined !== up) {
      return this.isPrimaryKeyUniqueName(up) ? {
        isPrimaryKey : true,
        uniqueName : up,
        key : this.setPrimaryKey({}, name)
      } : {
        isUniqueKey : true,
        uniqueName : up,
        key : name
      };
    }
  }

  copyProperties(output) {
    var style = this;
    var noformat = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    return output ? codeContract.partialCopy(output, noformat ? this.allProperties : function(newScaleKey) {
      return style.allProperties.includes(newScaleKey);
    }) : output;
  }

  setDefaultValues(options) {
    this.schema.tableFields.forEach(function(configuration) {
      if (undefined !== configuration.default && (null === options[configuration.name] || undefined === options[configuration.name])) {
        options[configuration.name] = configuration.default;
      }
    });
  }

  splitEntityAndVersion(obj) {
    var result = obj[ENTITY_VERSION_PROPERTY];
    return Reflect.deleteProperty(obj, ENTITY_VERSION_PROPERTY), {
      version : result,
      entity : obj
    };
  }

  get properties() {
    return this.allProperties;
  }

  get jsonProperties() {
    return this.allJsonProperties;
  }

  get schemaObject() {
    return this.schema;
  }

  get isCompsiteKey() {
    return this.compositeKeys.length > 1;
  }

  get primaryKey() {
    return this.primaryKeyProperty;
  }

  get compositeKeys() {
    return this.compositKeyProperties;
  }

  get indexes() {
    return this.allNormalIndexes;
  }

  get uniqueIndexes() {
    return this.allUniqueIndexes;
  }

  get maxCached() {
    return this.maxCachedCount;
  }

  get modelName() {
    return this.name;
  }

  get isLocal() {
    return this.local;
  }

  get isReadonly() {
    return this.readonly;
  }
  get memCached() {
    return this.memory;
  }
};

ModelSchema.PRIMARY_KEY_NAME = "__PrimaryKey__";

module.exports = {
  FieldTypes: output.FieldTypes,
  InvalidEntityKeyError,
  ModelSchema,
};
