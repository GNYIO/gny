import LRU from 'lru-cache';
import { ModelSchema } from './modelSchema.js';

export class CustomCache {
  private modelSchema: ModelSchema;
  private lruCache: LRU<string, Object>;
  private postEvit: (key: string, obj: Object) => void; // callback

  /**
   * @constructor
   * @param {?} modelSchema
   * @param {number} max
   */
  constructor(modelSchema: ModelSchema, max: number) {
    // modelSchema(delegate) then max=Infinity; { memory: false, maxCached: undefined }
    this.modelSchema = modelSchema;
    this.lruCache = new LRU<string, Object>({
      max: max,
      dispose: this.doEvit.bind(this),
    });
  }

  /**
   * @param {string} key - Example: "{"address":"G2yY6XpLzt1Zx69QJX1t6mhJeGZyH"}"
   * @param {Object} obj - Example: "{"tid":"5f612493b10b79a8262a0b64c7a29f4d21d07d55f737e1612de671d39eace479","username":"gny_d47","address":"G2yY6XpLzt1Zx69QJX1t6mhJeGZyH","publicKey":"712ee616912efaf95e94157f6b5e6681fdf7cc7a3bc4caa7cd8359ee8c4c33b6","votes":0,"producedBlocks":1,"missedBlocks":0,"fees":0,"rewards":0,"_version_":2}"
   */
  doEvit(key: string, obj: Object) {
    if (this.postEvit) {
      this.postEvit(key, obj);
    }
  }

  /**
   * Clears the whole cache
   */
  clear() {
    this.lruCache.reset();
  }

  /**
   * @param {string} key - Example: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}"
   */
  has(key: string) {
    return this.lruCache.has(key);
  }

  get(key: string) {
    return this.lruCache.get(key);
  }

  forEach(callback: (value: Object, key: string) => void) {
    this.lruCache.forEach(callback);
  }

  /**
   * @param {string} key - Example: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}"
   * @param {Object} obj - Example: "{"tid":"4c1ff5bfa17873df950b81f371cd0c9273d87af97af148b215d2f24545e383b2","address":"GM5CevQY3brUyRtDMng5Co41nWHh","username":"gny_d1","publicKey":"0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9","votes":0,"producedBlocks":0,"missedBlocks":0,"fees":0,"rewards":0,"_version_":1}"
   */
  set(key: string, obj: Object) {
    this.lruCache.set(key, obj);
  }

  evit(key: string) {
    this.lruCache.del(key);
  }

  exists(key: string) {
    return this.lruCache.has(key);
  }

  get onEvit() {
    return this.postEvit;
  }

  set onEvit(func) {
    this.postEvit = func;
  }

  get model() {
    return this.modelSchema;
  }
}
