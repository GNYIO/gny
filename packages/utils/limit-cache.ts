import { ILimitCache } from '../../packages/interfaces';

const DEFAULT_LIMIT = 10000;

export class LimitCache<KEY, VAL> implements ILimitCache<KEY, VAL> {
  private cache = new Map<KEY, VAL>();
  private index = new Array<KEY>();
  private limit: number;

  constructor(limit?: number) {
    this.limit = limit || DEFAULT_LIMIT;
  }

  public set(key: KEY, value: VAL) {
    if (this.cache.has(key) && this.cache.get(key) === value) {
      // sameResult is already saved
      return;
    }
    if (this.cache.size >= this.limit && !this.cache.has(key)) {
      const dropKey = this.index.shift();
      this.cache.delete(dropKey);
    }
    this.cache.set(key, value);
    this.index.push(key);
  }

  public has(key: KEY) {
    return this.cache.has(key);
  }

  public getLimit() {
    return this.limit;
  }
}
