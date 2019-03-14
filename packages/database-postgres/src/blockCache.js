
class BlockCache {
  /**
   * @param {number} maxCached
   * @return {undefined}
   */
  constructor(maxCached) {
    /** @type {!Map} */
    this.cache = new Map;
    /** @type {number} */
    this.minHeight = -1;
    /** @type {number} */
    this.maxHeight = -1;
    /** @type {number} */
    this.maxCachedCount = maxCached;
  }


  isCached(height) {
    return height > 0 && height >= this.minHeight && height <= this.maxHeight;
  }


  push(block) {
    if (this.maxHeight >= 0 && block.height !== this.maxHeight + 1) {
      throw new Error("invalid block height, expected : " + (this.maxHeight + 1) + " actual : " + block.height);
    }
    this.cache.set(block.height, block);
    this.maxHeight = block.height;
    this.minHeight = -1 === this.minHeight ? block.height : this.minHeight;
    if (this.cache.size >= this.maxCachedCount) {
      this.cache.delete(this.minHeight++);
    }
  }

  get(height) {
    return this.cache.get(height);
  }

  getById(blockId) {
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
      /** @type {boolean} */
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


  evitUntil(minEvitHeight) {
    if (minEvitHeight > this.maxHeight) {
      return;
    }
    /** @type {number} */
    var h = Math.max(minEvitHeight, this.minHeight);
    /** @type {number} */
    var type = h + 1;
    for (; type <= this.maxHeight; type++) {
      this.cache.delete(type);
    }
    this.minHeight = h === this.minHeight ? -1 : this.minHeight;
    /** @type {number} */
    this.maxHeight = -1 === this.minHeight ? -1 : h;
  }


  get cachedHeightRange() {
    return {
      min : this.minHeight,
      max : this.maxHeight
    };
  }
}

module.exports = {
  BlockCache,
};
