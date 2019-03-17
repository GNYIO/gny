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

  public forEach(array) {
    this.cache.forEach(array);
  }

  /**
   * @param {string} key - Example: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}"
   */
  public evit(key: string) {
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
