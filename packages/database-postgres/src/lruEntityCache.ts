import { CustomCache } from './customCache';
import { LoggerWrapper, LogManager } from './logger';
import { ModelSchema } from './modelSchema';
import { ModelIndex } from './defaultEntityUniqueIndex';
import { UniquedCache } from './uniquedCache';
import * as CodeContract from './codeContract';
import { isString } from 'util';
import { toArray } from './helpers/index';

export interface PropertyValue {
  name: string;
  value: any;
}

export class LRUEntityCache {
  public static readonly MIN_CACHED_COUNT = 100;
  public static readonly DEFULT_MAX_CACHED_COUNT = 5e4;

  private log: LoggerWrapper;
  private modelSchemas: Map<string, ModelSchema>;
  private modelCaches: Map<string, UniquedCache>;

  /**
   * @constructor
   */
  constructor(modelSchemas: Map<string, ModelSchema>) {
    this.log = LogManager.getLogger('LRUEntityCache');
    this.modelSchemas = modelSchemas;
    this.modelCaches = new Map<string, UniquedCache>();
  }

  private getMaxCachedCount(schema: ModelSchema) {
    const maxPrimaryDepth =
      schema.maxCached || LRUEntityCache.DEFULT_MAX_CACHED_COUNT;
    return Math.max(LRUEntityCache.MIN_CACHED_COUNT, maxPrimaryDepth);
  }

  private createCache(schema: ModelSchema) {
    return new CustomCache(schema, this.getMaxCachedCount(schema));
  }

  private registerModel(schema: ModelSchema, uniqueIndexes: ModelIndex[]) {
    const na = schema.modelName;
    if (this.modelCaches.has(na)) {
      throw new Error("model '" + na + "' exists already");
    }
    const data = this.createCache(schema);
    this.modelCaches.set(na, new UniquedCache(data, uniqueIndexes));
  }

  private unRegisterModel(model: string) {
    // can be deleted? clear('Account') is the same
    this.modelCaches.delete(model);
  }

  private getModelCache(model: string) {
    const schema = this.modelSchemas.get(model);
    if (undefined === schema) {
      throw new Error(
        "Model schema ( name = '" + model + "' )  does not exists"
      );
    }
    // TODO: check logic
    if (!this.modelCaches.has(model)) {
      this.registerModel(schema, schema.uniqueIndexes);
    }
    return this.modelCaches.get(model);
  }

  /**
   * @param objOrString - Example: {address:"G3VU8VKndrpzDVbKzNTExoBrDAnw5"}
   */
  private getCacheKey(objOrString: string | number | {}) {
    if (CodeContract.isPrimitiveKey(objOrString)) {
      return String(objOrString);
    } else {
      return JSON.stringify(objOrString);
    }
  }

  public clear(name?: string) {
    if (isString(name)) {
      this.getModelCache(name).clear();
      this.modelCaches.delete(name);
      return undefined;
    }
    let _iteratorNormalCompletion3 = true;
    let _didIteratorError5 = false;
    let _iteratorError5 = undefined;
    try {
      const _iterator3 = this.modelCaches.values()[Symbol.iterator]();
      let $__6;
      for (
        ;
        !(_iteratorNormalCompletion3 = ($__6 = _iterator3.next()).done);
        _iteratorNormalCompletion3 = true
      ) {
        const item = $__6.value;
        item.clear();
      }
    } catch (err) {
      _didIteratorError5 = true;
      _iteratorError5 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError5) {
          throw _iteratorError5;
        }
      }
    }
    this.modelCaches.clear();
  }

  /**
   * @param {string} model - Example: 'Account'
   * @param {Object} key - Example: { address:"G3VU8VKndrpzDVbKzNTExoBrDAnw5" }
   */
  get(model: string, key: any) {
    const cache = this.getModelCache(model);
    const cacheKey = this.getCacheKey(key);
    if (this.modelCaches.has(model) && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    } else {
      return undefined;
    }
  }

  getUnique(model: string, indexName: string, value: any) {
    return this.getModelCache(model).getUnique(indexName, value);
  }

  existsUnique(model: string, indexName: string, value: any) {
    return undefined !== this.getUnique(model, indexName, value);
  }

  /**
   * @param {String} model - Example: 'Account'
   * @param {Object} value - Example: {address:"G3VU8VKndrpzDVbKzNTExoBrDAnw5"}
   * @param {Object[]} data - Example: [{ name:"gny", value:-40000000000000000 }]
   */
  refreshCached(model: string, value: Object, data: PropertyValue[]) {
    let componentRef;
    const element = this.get(model, value);
    if (undefined === element) {
      return false;
    }
    const columns = data.map(column => column.name);

    // TODO: refactor
    return (componentRef = this.modelSchemas.get(
      model
    )).hasUniqueProperty.apply(componentRef, toArray(columns))
      ? (this.log.trace(
          'refresh cached with uniqued index, key = ' +
            JSON.stringify(value) +
            ' modifier = ' +
            JSON.stringify(data)
        ),
        this.evit(model, value),
        data.forEach(function(attr) {
          return (element[attr.name] = attr.value);
        }),
        this.put(model, value, element),
        true)
      : (this.log.trace(
          'refresh cached entity, key = ' +
            JSON.stringify(value) +
            ' modifier = ' +
            JSON.stringify(data)
        ),
        data.forEach(function(attr) {
          return (element[attr.name] = attr.value);
        }),
        false);
  }

  /**
   * @param {string} model - Example: 'Delegate'
   */
  public getAll(model: string) {
    // TODO: checkout
    const result = [];
    const keys = this.getModelCache(model);
    if (undefined !== keys) {
      keys.forEach(function(err) {
        result.push(err);
      });
      return result;
    }
  }

  /**
   * @param {string} model - Example: 'Account'
   * @param {Object} key - Example: {address:"G3VU8VKndrpzDVbKzNTExoBrDAnw5"}
   * @param {Object} data - Example: "{"username":null,"gny":0,"isDelegate":0,"isLocked":0,"lockHeight":0,"lockAmount":0,"address":"G3VU8VKndrpzDVbKzNTExoBrDAnw5","_version_":1}"
   */
  put(model: string, key: any, data: any) {
    this.log.trace(
      'put cache, model = ' +
        model +
        ', key = ' +
        JSON.stringify(key) +
        ', entity = ' +
        JSON.stringify(data)
    );

    this.getModelCache(model).set(this.getCacheKey(key), data);
  }

  /**
   * @param {string} model - Example: 'Delegate'
   * @param {Object} id - Example: {address:"GM5CevQY3brUyRtDMng5Co41nWHh" }
   */
  evit(model: string, id) {
    const key = this.getCacheKey(id);
    this.log.trace('evit cache, model = ' + model + ', key = ' + key);

    const elements = this.getModelCache(model);
    if (elements) {
      elements.evit(key);
    }
  }

  /**
   * @param {string} model - Example: 'Account'
   * @param {Object} key - Example: {address:"G3VU8VKndrpzDVbKzNTExoBrDAnw5"}
   */
  public exists(model: string, key) {
    return undefined !== this.get(model, this.getCacheKey(key));
  }

  public existsModel(model: string) {
    return this.modelCaches.has(model);
  }

  get models() {
    return Array.from(this.modelSchemas.values());
  }
}
