import { toArray, } from './helpers/index';
import { isBoolean, isString, isObject, } from 'util';
import * as codeContract from './codeContract';
import { ENTITY_VERSION_PROPERTY } from './entityChangeType';
import * as lodash from 'lodash';
import { getConnection } from 'typeorm';
import { ModelIndex } from './defaultEntityUniqueIndex';

export class ModelSchema {
  public static readonly PRIMARY_KEY_NAME = '__PrimaryKey__';

  private schemas: Map<string, any>;
  private _modelName: string;
  public memory: boolean;
  public maxCachedCount: boolean;
  public propertiesSet: Set<any>;
  public uniquePropertiesSet: Set<any>;
  public allProperties: string[];
  public allNormalIndexes: any[];
  public allUniqueIndexes: ModelIndex[];

  constructor(schema: any, name: string) {
    this._modelName = name;
    this.memory = true === schema.meta.memory;
    this.maxCachedCount = this.memory ? Number.POSITIVE_INFINITY : schema.meta.maxCached;
    this.propertiesSet = new Set;
    this.uniquePropertiesSet = new Set;
    if (process.env.NODE_ENV !== 'test') {
      this.parseProperties();
    }
  }

  parseProperties() {
    const meta = getConnection().getRepository(this.modelName).metadata;

    this.allUniqueIndexes = meta.indices
      .filter(x => x.isUnique)
      .map((index) => {
        return  {
          name: index.columns[0].propertyName,
          properties: index.columns.map(col => col.propertyName),
        };
      });
    this.allNormalIndexes = meta.indices
      .filter(x => !x.isUnique)
      .map((index) => {
        return {
          name: index.columns[0].propertyName,
          properties: index.columns.map(col => col.propertyName),
        };
      });

    this.allProperties = Object.keys(meta.propertiesMap);
    this.allProperties.forEach((item) => {
      this.propertiesSet.add(item);
    });
  }

  hasUniqueProperty() {
    throw new Error('not implemneted yet')
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
    var canvas = Object.keys(level);
    return this.isCompsiteKey ? this.isValidPrimaryKey(level) : 1 === canvas.length && canvas[0] === this.primaryKey;
  }

  setPrimaryKey(val, id) {
    if (!this.isValidPrimaryKey(id)) {
      throw new Error("Invalid PrimaryKey of model '" + this.modelName + "', key=''" + JSON.stringify(id));
    }
    if (!this.isCompsiteKey && codeContract.isPrimitiveKey(id)) {
      val[this.primaryKey] = id;
    } else if (this.isCompsiteKey) {
      codeContract.partialCopy(id, this.compositeKeys, val);
    } else {
      codeContract.partialCopy(id, [this.primaryKey], val);
    }
    return val;
    // return !this.isCompsiteKey && codeContract.isPrimitiveKey(id) ? val[this.primaryKey] = id : this.isCompsiteKey ? codeContract.partialCopy(id, this.compositeKeys, val) : , val;
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

  // moved to helpers/index
  // resolveKey(name/*: EntityKey*/)/*:ResolvedEntiytKey*/ {
  //   const up = this.getUniqueName(name);
  //   if (undefined !== up) {
  //     if (this.isPrimaryKeyUniqueName(up)) {
  //       const result = {
  //         isPrimaryKey : true,
  //         uniqueName : up,
  //         key : this.setPrimaryKey({}, name),
  //       };
  //       return result;
  //     } else {
  //       const result = {
  //         isUniqueKey : true,
  //         uniqueName : up,
  //         key : name,
  //       };
  //       return result;
  //     }
  //   }
  // }

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
    return this._modelName;
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
}
