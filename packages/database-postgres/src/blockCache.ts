import { Block } from '../entity/Block';
import BigNumber from 'bignumber.js';

/**
 * Warning1: The oldest cached block is never removed
 * Warning2: When rolling back to the "oldest" block, we can
 * then start caching blocks where its height IS NOT +1
 */
export class BlockCache {
  private cache: Map<string, Block>;
  private minHeight: string;
  private maxHeight: string;
  private maxCachedCount: number;

  constructor(maxCached: number) {
    if (!Number.isInteger(maxCached) || !(maxCached > 0)) {
      throw new Error('please provide a positive integer');
    }

    this.cache = new Map<string, Block>();
    this.minHeight = String(-1);
    this.maxHeight = String(-1);
    this.maxCachedCount = maxCached;
  }

  public isCached(height: string) {
    return (
      new BigNumber(height).isGreaterThanOrEqualTo(0) &&
      new BigNumber(height).isGreaterThanOrEqualTo(this.minHeight) &&
      new BigNumber(height).isLessThanOrEqualTo(this.maxHeight)
    );
  }

  public push(block: Block) {
    if (
      new BigNumber(this.maxHeight).isGreaterThanOrEqualTo(0) &&
      !new BigNumber(this.maxHeight).plus(1).isEqualTo(block.height)
    ) {
      throw new Error(
        'invalid block height, expected : ' +
          (this.maxHeight + 1) +
          ' actual : ' +
          block.height
      );
    }
    this.cache.set(block.height, block);
    this.maxHeight = block.height;
    this.minHeight = new BigNumber(-1).isEqualTo(this.minHeight)
      ? block.height
      : this.minHeight;
    if (this.cache.size > this.maxCachedCount) {
      const key = new BigNumber(this.minHeight).toFixed();
      this.cache.delete(key);
      this.minHeight = new BigNumber(this.minHeight).plus(1).toFixed();
    }
  }

  get(height: string) {
    return this.cache.get(height);
  }

  getById(blockId: string): Block {
    for (const [, block] of this.cache.entries()) {
      if (block.id === blockId) {
        return block;
      }
    }
    return undefined;
  }

  evitUntil(minEvitHeight: string) {
    if (new BigNumber(minEvitHeight).isGreaterThan(this.maxHeight)) {
      return;
    }
    const height = BigNumber.maximum(minEvitHeight, this.minHeight).toFixed();
    let type: string = new BigNumber(height).plus(1).toFixed();
    for (
      ;
      new BigNumber(type).isLessThanOrEqualTo(this.maxHeight);
      type = new BigNumber(type).plus(1).toFixed()
    ) {
      this.cache.delete(type);
    }
    this.minHeight = new BigNumber(height).isEqualTo(this.minHeight)
      ? String(-1)
      : this.minHeight;
    this.maxHeight = new BigNumber(-1).isEqualTo(this.minHeight)
      ? String(-1)
      : height;

    // this.maxHeight = height;
  }

  get cachedHeightRange() {
    return {
      min: this.minHeight,
      max: this.maxHeight,
    };
  }
}
