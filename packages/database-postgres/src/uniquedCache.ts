import {
  DefaultEntityUniqueIndex,
  ModelIndex,
} from './defaultEntityUniqueIndex';
import { CustomCache } from './customCache';
import * as CodeContract from './codeContract';

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
    modelIndex.forEach(one => {
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
   * @param {Object} test - Example: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh","username":null,"gny":"0","isDelegate":0,"isLocked":0,"lockHeight":0,"lockAmount":0,"_version_":2}"
   */
  private afterEvit(component: string, test) {
    this.indexes.forEach(function(index) {
      const handler = CodeContract.partialCopy(test, index.fields);
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
   * "gny":"0",
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
      if (oneIndex.fields.some(prop => !obj[prop])) {
        // inverts falsey value
        return;
      }
      const r = CodeContract.partialCopy(obj, oneIndex.fields);
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
