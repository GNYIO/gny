import * as codeContract from './codeContract';
import { isString } from 'util';
import { toArray } from './helpers/index';

export class DefaultEntityUniqueIndex {
  /**
   * @param {!Object} name
   * @param {!Object} indexFields
   * @return {undefined}
   */
  constructor(name, indexFields) {
    this.name = name;
    this.indexFields = indexFields;
    this.indexMap = new Map;
  }
  getIndexKey(storedComponents) {
    return JSON.stringify(storedComponents);
  }

  exists(event) {
    return this.indexMap.has(this.getIndexKey(event));
  }

  get(opt_key) {
    return this.indexMap.get(this.getIndexKey(opt_key));
  }

  add(match, url) {
    var key = this.getIndexKey(match);
    if (this.indexMap.has(key)) {
      throw new Error("Unique named '" + this.name + "' key = '" + key + "' exists already");
    }
    this.indexMap.set(key, url);
  }

  delete(url) {
    this.indexMap.delete(this.getIndexKey(url));
  }

  get indexName() {
    return this.name;
  }

  get fields() {
    return this.indexFields;
  }
}


export class UniquedCache {
  /**
   * @param {string} data
   * @param {!Array} reducers
   * @return {undefined}
   */
  constructor(data, reducers) {
    this.cache = data;
    this.cache.onEvit = this.afterEvit.bind(this);
    this.indexes = new Map;
    reducers.forEach((value) => {
      return this.indexes.set(value.name, this.createUniqueIndex(value));
    });
  }

  createUniqueIndex(task) {
    return new DefaultEntityUniqueIndex(task.name, task.properties);
  }

  afterEvit(component, test) {
    this.indexes.forEach(function(e) {
      var handler = codeContract.partialCopy(test, e.fields);
      e.delete(handler);
    });
  }

  has(i) {
    return this.cache.has(i);
  }

  set(key, obj) {
    if (this.cache.has(key)) {
      this.evit(key);
    }
    this.cache.set(key, obj);
    this.indexes.forEach(function(res) {
      if (res.fields.some(function(attrPropertyName) {
        return !obj[attrPropertyName];
      })) {
        return;
      }
      var r = codeContract.partialCopy(obj, res.fields);
      res.add(r, String(key));
    });
  }

  get(query) {
    return this.cache.get(query);
  }

  forEach(array) {
    this.cache.forEach(array);
  }

  evit(e) {
    var parsed_expression = this.cache.get(e);
    if (undefined !== parsed_expression) {
      this.cache.evit(e);
      this.afterEvit(e, parsed_expression);
    }
  }


  getUnique(key, db) {
    var i = this.indexes.get(key).get(db);
    return undefined === i ? undefined : this.cache.get(i);
  }

  clear() {
    this.forEach((canCreateDiscussions, args) => {
      return this.evit(args);
    });
  }
}


export class UniquedEntityCache {
  /**
   * @param {!Object} emitter
   * @param {string} model
   * @return {undefined}
   */
  constructor(emitter, model) {
    this.log = emitter;
    this.modelSchemas = model;
    this.modelCaches = new Map;
  }

  createCache(options) {
    throw new codeContract.NotImplementError;
  }

  registerModel(name, index) {
    var m = name.modelName;
    if (this.modelCaches.has(m)) {
      throw new Error("model '" + m + "' exists already");
    }
    var data = this.createCache(name);
    this.modelCaches.set(m, new UniquedCache(data, index));
  }

  unRegisterModel(marketID) {
    this.modelCaches.delete(marketID);
  }

  getModelCache(model) {
    var schema = this.modelSchemas.get(model);
    if (undefined === schema) {
      throw new Error("Model schema ( name = '" + model + "' )  does not exists");
    }
    // TODO: check logic
    this.modelCaches.has(model) || this.registerModel(schema, schema.uniqueIndexes);
    return this.modelCaches.get(model);
  }

  getCacheKey(text) {
    return codeContract.isPrimitiveKey(text) ? String(text) : JSON.stringify(text);
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

  get(table, key) {
    var cacheConf = this.getModelCache(table);
    var cacheKey = this.getCacheKey(key);
    return this.modelCaches.has(table) && cacheConf.has(cacheKey) ? cacheConf.get(cacheKey) : undefined;
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

  getAll(members, callback) {
    var layer = new Array;
    var keys = this.getModelCache(members);
    if (undefined !== keys) {
      keys.forEach(function(err) {
        if (!callback || callback && callback(err)) {
          layer.push(err);
        }
      });
      return layer;
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
