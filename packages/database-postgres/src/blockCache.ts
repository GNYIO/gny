import { Block } from '../entity/Block';


export class BlockCache {
  private cache: Map<number, Block>;
  private minHeight: number;
  private maxHeight: number;
  private maxCachedCount: number;

  constructor(maxCached: number) {
    this.cache = new Map<number, Block>();
    this.minHeight = -1;
    this.maxHeight = -1;
    this.maxCachedCount = maxCached;
  }

  public isCached(height: number) {
    return height > 0 && height >= this.minHeight && height <= this.maxHeight;
  }

  push(block: Block) {
    if (this.maxHeight >= 0 && block.height !== this.maxHeight + 1) {
      throw new Error('invalid block height, expected : ' + (this.maxHeight + 1) + ' actual : ' + block.height);
    }
    this.cache.set(block.height, block);
    this.maxHeight = block.height;
    this.minHeight = -1 === this.minHeight ? block.height : this.minHeight;
    if (this.cache.size >= this.maxCachedCount) {
      this.cache.delete(this.minHeight++);
    }
  }

  get(height: number) {
    return this.cache.get(height);
  }

  getById(blockId: string) {
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;
    try {
      var _iterator4 = this.cache.values()[Symbol.iterator]();
      var _step4;
      for (; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var domain = _step4.value;
        if (domain.id === blockId) {
          return domain;
        }
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4.return) {
          _iterator4.return();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }
  }


  evitUntil(minEvitHeight: number) {
    if (minEvitHeight > this.maxHeight) {
      return;
    }
    const height = Math.max(minEvitHeight, this.minHeight);
    let type = height + 1;
    for (; type <= this.maxHeight; type++) {
      this.cache.delete(type);
    }
    this.minHeight = height === this.minHeight ? -1 : this.minHeight;
    this.maxHeight = -1 === this.minHeight ? -1 : height;
  }

  get cachedHeightRange() {
    return {
      min : this.minHeight,
      max : this.maxHeight
    };
  }
}
