import * as LRU from 'lru-cache';
import { UniquedEntityCache } from './defaultEntityUniqueIndex';
import * as customLogger from './logger';

class CustomCache {
  private modelSchema: any;
  private lruCache: LRU.Cache;

  /**
   * @param {?} modelSchema
   * @param {number} max
   * @return {undefined}
   */
  constructor(modelSchema, max: number) {
    this.modelSchema = modelSchema;
    this.lruCache = new LRU({
      max : max,
      dispose : this.doEvit.bind(this)
    });
  }
  doEvit(e, exceptionLevel) {
    if (this.postEvit) {
      this.postEvit(e, exceptionLevel);
    }
  }

  clear() {
    this.lruCache.reset();
  }

  has(i) {
    return this.lruCache.has(i);
  }

  get(sid) {
    return this.lruCache.get(sid);
  }

  forEach(userFunction) {
    this.lruCache.forEach(userFunction);
  }

  set(x, mode) {
    this.lruCache.set(x, mode);
  }

  evit(context) {
    this.lruCache.del(context);
  }

  exists(typeName) {
    return this.lruCache.has(typeName);
  }

  get onEvit() {
    return this.postEvit;
  }

  set onEvit(model) {
    this.postEvit = model;
  }

  get model() {
    return this.modelSchema;
  }
}

export class LRUEntityCache extends UniquedEntityCache {
  public static readonly MIN_CACHED_COUNT = 100;
  public static readonly DEFULT_MAX_CACHED_COUNT = 5e4;

  constructor(schemas) {
    const logger = customLogger.LogManager.getLogger("LRUEntityCache");
    super(logger, schemas);
  }

  getMaxCachedCount(callback) {
    const maxPrimaryDepth = callback.maxCached || LRUEntityCache.DEFULT_MAX_CACHED_COUNT;
    return Math.max(LRUEntityCache.MIN_CACHED_COUNT, maxPrimaryDepth);
  }

  createCache(e) {
    return new CustomCache(e, this.getMaxCachedCount(e));
  }
}
