import * as CodeContract from './codeContract';
import { ENTITY_VERSION_PROPERTY } from './entityChangeType';
import * as lodash from 'lodash';
import { ObjectLiteral } from 'typeorm';
import { ModelIndex } from './defaultEntityUniqueIndex';
import { isObject } from 'util';

// export type ModelSchemaMetadata = Pick<EntityMetadata, 'name' | 'indices' | 'propertiesMap'>;

export type IndexColumn = {
  propertyName: string;
};
export type OneIndex = {
  isUnique: boolean;
  columns: IndexColumn[];
};
export type NormalColumn = {
  name: string;
  default?: any;
};
export type MetaSchema = {
  name: string;
  indices: OneIndex[];
  columns: NormalColumn[];

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
  private allJsonProperties: any[];
  public allNormalIndexes: ModelIndex[];
  public allUniqueIndexes: ModelIndex[];
  private primaryKeyProperty: string;
  private compositKeyProperties: string[];
  private columns: NormalColumn[];

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
    this.maxCachedCount = this.memory
      ? Number.POSITIVE_INFINITY
      : meta.maxCachedCount;

    this.allUniqueIndexes = meta.indices
      .filter(x => x.isUnique)
      .map(index => {
        return {
          name: index.columns[0].propertyName,
          properties: index.columns.map(col => col.propertyName),
        };
      });
    this.allNormalIndexes = meta.indices
      .filter(x => !x.isUnique)
      .map(index => {
        return {
          name: index.columns[0].propertyName,
          properties: index.columns.map(col => col.propertyName),
        };
      });

    if (this.allNormalIndexes.length >= 2) {
      this.compositKeyProperties = this.allNormalIndexes.map(one => {
        return one.name;
      });
    } else {
      this.compositKeyProperties = [];
    }

    this.allProperties = meta.columns.map(col => col.name);
    this.allProperties.forEach(item => {
      this.propertiesSet.add(item);
    });

    this.allUniqueIndexes.forEach(unique => {
      unique.properties.forEach(uniqueColumn => {
        this.uniquePropertiesSet.add(uniqueColumn);
      });
    });

    this.primaryKeyProperty = this.allNormalIndexes[0]
      ? this.allNormalIndexes[0].name
      : undefined;

    this.columns = meta.columns;

    this.allJsonProperties = [];
  }

  public hasUniqueProperty(...args: string[]) {
    return args.some(geomData => {
      return this.uniquePropertiesSet.has(geomData);
    });
  }

  public isValidProperty(typeName) {
    return this.propertiesSet.has(typeName);
  }

  private isValidEntityKey(selector) {
    return this.isValidPrimaryKey(selector) || this.isValidUniqueKey(selector);
  }

  private isNormalizedPrimaryKey(params) {
    if (!isObject(params)) {
      return;
    }
    const canvas = Object.keys(params);
    return this.isCompsiteKey
      ? this.isValidPrimaryKey(params)
      : 1 === canvas.length && canvas[0] === this.primaryKey;
  }

  public setPrimaryKey(source: ObjectLiteral, key) {
    if (!this.isValidPrimaryKey(key)) {
      throw new Error(
        "Invalid PrimaryKey of model '" +
          this.modelName +
          "', key=''" +
          JSON.stringify(key)
      );
    }
    if (!this.isCompsiteKey && CodeContract.isPrimitiveKey(key)) {
      source[this.primaryKey] = key;
    } else if (this.isCompsiteKey) {
      CodeContract.partialCopy(key, this.compositeKeys, source);
    } else {
      CodeContract.partialCopy(key, [this.primaryKey], source);
    }
    return source;
  }

  public getPrimaryKey(val: Object) {
    if (this.isCompsiteKey) {
      return CodeContract.partialCopy(val, this.compositeKeys);
    } else {
      return val[this.primaryKey];
    }
  }

  public getNormalizedPrimaryKey(obj) {
    return this.isCompsiteKey
      ? CodeContract.partialCopy(obj, this.compositeKeys)
      : CodeContract.partialCopy(obj, [this.primaryKey]);
  }

  private normalizePrimaryKey(result) {
    if (!CodeContract.isPrimitiveKey(result)) {
      return result;
    }
    const item = {};
    item[this.primaryKey] = result;
    return item;
  }

  public isValidPrimaryKey(key) {
    return (
      (!this.isCompsiteKey &&
        (CodeContract.isPrimitiveKey(key) ||
          this.isNormalizedPrimaryKey(key))) ||
      0 === lodash.xor(Object.keys(key), this.compositeKeys).length
    );
  }

  private isValidUniqueKey(name) {
    return undefined !== this.getUniqueName(name);
  }

  private getUniqueName(data) {
    if (this.isValidPrimaryKey(data)) {
      return ModelSchema.PRIMARY_KEY_NAME;
    }
    const col = Object.keys(data);
    if (1 === col.length && col[0] === this.primaryKey) {
      return ModelSchema.PRIMARY_KEY_NAME;
    }
    const value = this.uniqueIndexes.find(function(other) {
      return 0 === lodash.xor(other.properties, col).length;
    });
    return undefined === value ? undefined : value.name;
  }

  private isPrimaryKeyUniqueName(data) {
    return data === ModelSchema.PRIMARY_KEY_NAME;
  }

  private getUniqueIndex(name) {
    return this.allUniqueIndexes.find(function(functionImport) {
      return functionImport.name === name;
    });
  }

  public copyProperties(data: Object, noformat = true) {
    if (data) {
      const alternative = newScaleKey =>
        this.allProperties.includes(newScaleKey);
      const secondParam = noformat ? this.allProperties : alternative;
      return CodeContract.partialCopy(data, secondParam);
    } else {
      return data;
    }
  }

  public setDefaultValues(data: ObjectLiteral) {
    this.columns.forEach(column => {
      const propIsNotSet =
        null === data[column.name] || undefined === data[column.name];

      if (undefined !== column.default && propIsNotSet) {
        data[column.name] = column.default;
      }
    });
  }

  private splitEntityAndVersion(obj) {
    const result = obj[ENTITY_VERSION_PROPERTY];
    return (
      Reflect.deleteProperty(obj, ENTITY_VERSION_PROPERTY),
      {
        version: result,
        entity: obj,
      }
    );
  }

  public resolveKey(data: Object) {
    const up = this.getUniqueName(data);
    if (undefined !== up) {
      return this.isPrimaryKeyUniqueName(up)
        ? {
            isPrimaryKey: true,
            uniqueName: up,
            key: this.setPrimaryKey({}, data),
          }
        : {
            isUniqueKey: true,
            uniqueName: up,
            key: data,
          };
    }
  }

  public get properties() {
    return this.allProperties;
  }

  public get jsonProperties() {
    return this.allJsonProperties;
  }

  public get schemaObject() {
    // TODO test
    throw new Error('not ready');
    return this.schema;
  }

  public get isCompsiteKey() {
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

  get memCached() {
    return this.memory;
  }
}
