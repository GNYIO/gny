import * as codeContract from './codeContract';
import { isString } from 'util';
import { toArray } from './helpers/index';
import { LoggerWrapper } from './logger';
import { CustomCache } from './lruEntityCache';

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
  public getUnique(index, value) {
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
  private modelSchemas: Map<any, any>;
  private modelCaches: Map<any, any>;


  constructor(logger: LoggerWrapper, modelSchemas: Map<any, any>) {
    this.log = logger;
    this.modelSchemas = modelSchemas;
    this.modelCaches = new Map;
  }

  createCache(options) {
    throw new codeContract.NotImplementError([]);
  }

  registerModel(schema, uniqueIndexes) {
    const na = schema.name;
    if (this.modelCaches.has(na)) {
      throw new Error("model '" + na + "' exists already");
    }
    const data = this.createCache(schema);
    this.modelCaches.set(na, new UniquedCache(data, uniqueIndexes));
  }

  unRegisterModel(marketID) {
    this.modelCaches.delete(marketID);
  }

  getModelCache(model: string) {
    const schema = this.modelSchemas.get(model);
    if (undefined === schema) {
      throw new Error("Model schema ( name = '" + model + "' )  does not exists");
    }
    // TODO: check logic
    this.modelCaches.has(model) || this.registerModel(schema, schema.uniqueIndexes);
    return this.modelCaches.get(model);
  }

  getCacheKey(text: string | number | {}) {
    if (codeContract.isPrimitiveKey(text)) {
      return String(text);
    } else {
      JSON.stringify(text);
    }
  }

  clear(name) {
    if (isString(name)) {
      this.getModelCache(name).clear();
      this.modelCaches.delete(name);
      return undefined;
    }
    /** @type {boolean} */
    var _iteratorNormalCompletion3 = true;
    /** @type {boolean} */
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
      /** @type {boolean} */
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

  get(table: string, key: any) {
    const cacheConf = this.getModelCache(table);
    const cacheKey = this.getCacheKey(key);
    if (this.modelCaches.has(table) && cacheConf.has(cacheKey)) {
      return cacheConf.get(cacheKey);
    } else {
      return undefined;
    }
  }

  getUnique(e, label, exception) {
    return this.getModelCache(e).getUnique(label, exception);
  }

  existsUnique(e, label, exception) {
    return undefined !== this.getUnique(e, label, exception);
  }

  refreshCached(key, value, remoteData) {
    var componentRef;
    var element = this.get(key, value);
    if (undefined === element) {
      return false;
    }
    var fixedDims = remoteData.map(function(engineDiscovery) {
      return engineDiscovery.name;
    });
    // TODO: refactor
    return (componentRef = this.modelSchemas.get(key)).hasUniqueProperty.apply(componentRef, toArray(fixedDims)) ? (this.log.trace("refresh cached with uniqued index, key = " + JSON.stringify(value) + " modifier = " + JSON.stringify(remoteData)), this.evit(key, value), remoteData.forEach(function(attr) {
      return element[attr.name] = attr.value;
    }), this.put(key, value, element), true) : (this.log.trace("refresh cached entity, key = " + JSON.stringify(value) + " modifier = " + JSON.stringify(remoteData)), remoteData.forEach(function(attr) {
      return element[attr.name] = attr.value;
    }), false);
  }

  getAll(members) {
    var result = [];
    var keys = this.getModelCache(members);
    if (undefined !== keys) {
      keys.forEach(function(err) {
        result.push(err);
      });
      return result;
    }
  }

  put(data, id, todos) {
    this.log.trace("put cache, model = " + data + ", key = " + JSON.stringify(id) + ", entity = " + JSON.stringify(todos));

    this.getModelCache(data).set(this.getCacheKey(id), todos);
  }

  evit(data, id) {
    var key = this.getCacheKey(id);
    this.log.trace("evit cache, model = " + data + ", key = " + key);

    var elements = this.getModelCache(data);
    if (elements) {
      elements.evit(key);
    }
  }

  exists(group, key) {
    return undefined !== this.get(group, this.getCacheKey(key));
  }

  existsModel(typeName) {
    return this.modelCaches.has(typeName);
  }

  dumpCache() {
    /** @type {string} */
    var ret = "--------------  DUMP CACHE  ----------------\n\n";
    this.modelCaches.forEach((wrappersTemplates, i) => {
      ret = ret + ("--------------Model " + i + "----------------\n");
      wrappersTemplates.forEach((storedComponents, params) => {
        ret = ret + ("key = " + this.getCacheKey(params) + ", entity = {" + JSON.stringify(storedComponents) + "} \n");
      });
      /** @type {string} */
      ret = ret + "\n";
    });
    ret = ret + "--------------   END   DUMP  ----------------\n";
    return ret;
  }

  get models() {
    // TODO: refactor
    return new (Function.prototype.bind.apply(Array, [null].concat(toArray(this.modelSchemas.values()))));
  }
}
