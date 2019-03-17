import * as codeContract from './codeContract';
import { isString } from 'util';
import { toArray } from './helpers/index';
import { LoggerWrapper } from './logger';
import { CustomCache } from './customCache';
import { ModelSchema } from './modelSchema';

/**
 * Class that represents an UNIQUE index for an Entity
 * Gets called for every UNIQUE index of a Model.
 * Example: Delegate has UNIQUE Constraints: tid, username, publicKey
 */
export class DefaultEntityUniqueIndex {
  private name: string;
  private indexFields: string[];
  indexMap: Map<string, string>;

  /**
   * @constructor
   * @param {string} name - Name of unique index - Example: "username"
   * @param {string[]} columns - Columns of that unique index - Example - ["username"]
   */
  constructor(name: string, indexFields: string[]) {
    this.name = name;
    this.indexFields = indexFields;
    this.indexMap = new Map<string, string>();
  }

  /**
   * @param {Object} key - can be for instance: { username:"gny_d1" }
   */
  private getIndexKey(key) {
    return JSON.stringify(key);
  }

  public exists(event) {
    return this.indexMap.has(this.getIndexKey(event));
  }

  /**
   * @param {Object} key - Object - Example: { username:"gny_d1" }
   */
  public get(key) {
    return this.indexMap.get(this.getIndexKey(key));
  }

  /**
   * Usage: this.indexMap.set('{"username":"gny_d1"}', '{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}')
   * @param {Object} uniqueColumnValue - Example: { username:"gny_d1" }
   * @param {string} keyStringified - Exapmle: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}"
   */
  public add(uniqueColumnValue, keyStringified: string) {
    const key = this.getIndexKey(uniqueColumnValue);
    if (this.indexMap.has(key)) {
      throw new Error("Unique named '" + this.name + "' key = '" + key + "' exists already");
    }
    this.indexMap.set(key, keyStringified);
  }

  /**
   * @param {Object} key - Example: { username: null }
   */
  public delete(key: any) {
    this.indexMap.delete(this.getIndexKey(key));
  }

  public get indexName() {
    return this.name;
  }

  public get fields() {
    return this.indexFields;
  }
}

export type ModelIndex = {
  name: string,
  properties: string[];
};



export class UniquedCache {
  private cache: CustomCache;
  private indexes: Map<string, DefaultEntityUniqueIndex>;

  /**
   * @constructor
   * @param {string} cache
   * @param {Array} modelIndex
   */
  constructor(cache: CustomCache, modelIndex: ModelIndex[]) {
    this.cache = cache;
    this.cache.onEvit = this.afterEvit.bind(this);
    this.indexes = new Map<string, DefaultEntityUniqueIndex>();
    modelIndex.forEach((one) => {
      return this.indexes.set(one.name, this.createUniqueIndex(one));
    });
  }

  /**
   * helper function
   */
  private createUniqueIndex(task: ModelIndex) {
    return new DefaultEntityUniqueIndex(task.name, task.properties);
  }

  /**
   * @param {string} component - Example: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}"
   * @param {Object} test - Example: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh","username":null,"gny":0,"isDelegate":0,"isLocked":0,"lockHeight":0,"lockAmount":0,"_version_":2}"
   */
  private afterEvit(component: string, test) {
    this.indexes.forEach(function(index) {
      const handler = codeContract.partialCopy(test, index.fields);
      index.delete(handler);
    });
  }

  /**
   * directly acccesses cache
   * @param key - Example: "{"address":"G3VU8VKndrpzDVbKzNTExoBrDAnw5"}"
   */
  public has(key: any) {
    return this.cache.has(key);
  }

  /**
   * @param {string} key - Example: '{"address":"G3VU8VKndrpzDVbKzNTExoBrDAnw5"}'
   * @param {Object} obj - Example: "{
   * "address":"G3VU8VKndrpzDVbKzNTExoBrDAnw5",
   * "username":null,
   * "gny":0,
   * "isDelegate":0,
   * "isLocked":0,
   * "lockHeight":0,
   * "lockAmount":0,
   * "_version_":1
   * }"
   */
  public set(key: string, obj: any) {
    if (this.cache.has(key)) {
      this.evit(key);
    }
    this.cache.set(key, obj);
    this.indexes.forEach(function(oneIndex) {
      if (oneIndex.fields.some((prop) => !obj[prop])) { // inverts falsey value
        return;
      }
      const r = codeContract.partialCopy(obj, oneIndex.fields);
      oneIndex.add(r, String(key));
    });
  }

  /**
   * directly accesses cache
   * @param key
   */
  public get(key) {
    return this.cache.get(key);
  }

  private forEach(array) {
    this.cache.forEach(array);
  }

  /**
   * @param {Object} key - Example: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}"
   */
  private evit(key) {
    const result = this.cache.get(key);
    if (undefined !== result) {
      this.cache.evit(key);
      this.afterEvit(key, result);
    }
  }

  /**
   * @param {string} index - Example: "username"
   * @param {Object} value - Example: { username:"gny_d1" }
   */
  public getUnique(index: string, value) {
    const result = this.indexes.get(index).get(value);
    if (undefined === result) {
      return undefined;
    } else {
      return this.cache.get(result);
    }
  }

  public clear() {
    this.forEach((canCreateDiscussions, args) => {
      return this.evit(args);
    });
  }
}


export class UniquedEntityCache {

  private log: LoggerWrapper;
  private modelSchemas: Map<string, ModelSchema>;
  private modelCaches: Map<string, UniquedCache>;


  constructor(logger: LoggerWrapper, modelSchemas: Map<string, ModelSchema>) {
    this.log = logger;
    this.modelSchemas = modelSchemas;
    this.modelCaches = new Map;
  }

  createCache(options: ModelSchema) {
    throw new codeContract.NotImplementError([]);
  }

  registerModel(schema: ModelSchema, uniqueIndexes: ModelIndex[]) {
    const na = schema.name;
    if (this.modelCaches.has(na)) {
      throw new Error("model '" + na + "' exists already");
    }
    const data = this.createCache(schema);
    this.modelCaches.set(na, new UniquedCache(data, uniqueIndexes));
  }

  unRegisterModel(model: string) {
    this.modelCaches.delete(model);
  }

  getModelCache(model: string) {
    const schema = this.modelSchemas.get(model);
    if (undefined === schema) {
      throw new Error("Model schema ( name = '" + model + "' )  does not exists");
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
  getCacheKey(objOrString: string | number | {}) {
    if (codeContract.isPrimitiveKey(objOrString)) {
      return String(objOrString);
    } else {
      return JSON.stringify(objOrString);
    }
  }

  clear(name?: string) {
    if (isString(name)) {
      this.getModelCache(name).clear();
      this.modelCaches.delete(name);
      return undefined;
    }
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;
    try {
      var _iterator3 = this.modelCaches.values()[Symbol.iterator]();
      var $__6;
      for (; !(_iteratorNormalCompletion3 = ($__6 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var item = $__6.value;
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
  refreshCached(model: string, value, data) {
    let componentRef;
    const element = this.get(model, value);
    if (undefined === element) {
      return false;
    }
    const fixedDims = data.map(function(engineDiscovery) {
      return engineDiscovery.name;
    });
    // TODO: refactor
    return (componentRef = this.modelSchemas.get(model)).hasUniqueProperty.apply(componentRef, toArray(fixedDims)) ? (this.log.trace('refresh cached with uniqued index, key = ' + JSON.stringify(value) + ' modifier = ' + JSON.stringify(data)), this.evit(model, value), data.forEach(function(attr) {
      return element[attr.name] = attr.value;
    }), this.put(model, value, element), true) : (this.log.trace('refresh cached entity, key = ' + JSON.stringify(value) + ' modifier = ' + JSON.stringify(data)), data.forEach(function(attr) {
      return element[attr.name] = attr.value;
    }), false);
  }

  /**
   * 
   * @param {string} model - Example: 'Delegate'
   */
  getAll(model: string) { // TODO: checkout
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
    this.log.trace('put cache, model = ' + model + ', key = ' + JSON.stringify(key) + ', entity = ' + JSON.stringify(data));

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
  exists(model: string, key) {
    return undefined !== this.get(model, this.getCacheKey(key));
  }

  existsModel(model: string) {
    return this.modelCaches.has(model);
  }

  get models() {
    // TODO: refactor
    return new (Function.prototype.bind.apply(Array, [null].concat(toArray(this.modelSchemas.values()))));
  }
}
