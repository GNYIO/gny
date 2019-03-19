import * as codeContract from './codeContract';
import { ENTITY_VERSION_PROPERTY } from './entityChangeType';
import * as lodash from 'lodash';
import { ObjectLiteral } from 'typeorm';
import { ModelIndex } from './defaultEntityUniqueIndex';
import { isObject } from 'util';
import { IndexMetadata } from 'typeorm/metadata/IndexMetadata';

// export type ModelSchemaMetadata = Pick<EntityMetadata, 'name' | 'indices' | 'propertiesMap'>;

export type MetaColumn = {
  propertyName: string;
};
export type OneIndex = {
  isUnique: boolean;
  columns: MetaColumn[];
};
export type MetaSchema = {
  name: string;
  indices: OneIndex[];
  propertiesMap: ObjectLiteral;

  memory: boolean;
  maxCachedCount?: number;
};

export class ModelSchema {
  public static readonly PRIMARY_KEY_NAME = '__PrimaryKey__';

  public modelSchemaMetadata: MetaSchema;
  private name: string;
  private memory: boolean;
  private maxCachedCount: number;
  public propertiesSet: Set<string>;
  public uniquePropertiesSet: Set<any>;
  public allProperties: string[];
  public allNormalIndexes: ModelIndex[];
  public allUniqueIndexes: ModelIndex[];
  private primaryKeyProperty: string;


  /**
   * @param {EntityMetadata} modelSchemaMetadata - An TypeORM EntityMetadat object from which all other properties can be derived from
   */
  constructor(modelSchemaMetadata: MetaSchema) {
    this.modelSchemaMetadata = modelSchemaMetadata;
    this.uniquePropertiesSet = new Set<string>();
    this.propertiesSet = new Set<string>();
    this.parseProperties();
  }

  private parseProperties() {
    const meta = this.modelSchemaMetadata;

    this.name = meta.name;
    this.memory = true === meta.memory;
    this.maxCachedCount = this.memory ? Number.POSITIVE_INFINITY : meta.maxCachedCount;


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

    this.allUniqueIndexes.forEach(unique => {
      unique.properties.forEach((uniqueColumn) => {
        this.uniquePropertiesSet.add(uniqueColumn);
      });
    });

    this.primaryKeyProperty = this.allNormalIndexes[0] ? this.allNormalIndexes[0].name : undefined;
  }

  hasUniqueProperty(...args: string[]) {
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
    throw new Error('not implemented');
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
    const item = {};
    item[this.primaryKey] = result;
    return item;
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
    const col = Object.keys(y);
    if (1 === col.length && col[0] === this.primaryKey) {
      return ModelSchema.PRIMARY_KEY_NAME;
    }
    const value = this.uniqueIndexes.find(function(other) {
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
    const result = obj[ENTITY_VERSION_PROPERTY];
    return Reflect.deleteProperty(obj, ENTITY_VERSION_PROPERTY), {
      version : result,
      entity : obj
    };
  }

  get properties() {
    return this.allProperties;
  }

  get jsonProperties() {
    throw new Error();
    return this.allJsonProperties;
  }

  get schemaObject() {
    throw new Error('not ready');
    return this.schema;
  }

  get isCompsiteKey() {
    return this.compositeKeys.length > 1;
  }

  get primaryKey() {
    return this.primaryKeyProperty;
  }

  get compositeKeys() {
    throw new Error('no compisiteKeys implemented');
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

  get memCached() {
    return this.memory;
  }
}
