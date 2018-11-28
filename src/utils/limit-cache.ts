const DEFAULT_LIMIT = 10000;

export default class LimitCache {
  private cache = new Map();
  public index = [];
  public options = {};
  public limit = DEFAULT_LIMIT;

  constructor() {}

  set(key, value) {
    if (this.cache.size >= this.limit && !this.cache.has(key)) {
      const dropKey = this.index.shift();
      this.cache.delete(dropKey);
    }
    this.cache.set(key, value);
    this.index.push(key);
  }

  has(key) {
    return this.cache.has(key);
  }
}
