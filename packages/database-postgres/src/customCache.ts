import * as LRU from 'lru-cache';

export class CustomCache {
  private modelSchema: any;
  private lruCache: LRU.Cache<any, any>;
  postEvit: any; // callback

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