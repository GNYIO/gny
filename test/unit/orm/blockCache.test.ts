import { BlockCache } from '@gny/database-postgres';
import { Block } from '@gny/database-postgres';
import { randomBytes } from 'crypto';

function createRandomBytes(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

function createBlock(height: string) {
  const block: Block = {
    height,
    version: 0,
    timestamp: 2003502305230,
    count: 0,
    fees: String(0),
    reward: String(0),
    signature: createRandomBytes(64),
    id: createRandomBytes(32),
    delegate: createRandomBytes(32),
    payloadHash: createRandomBytes(32),
    _version_: 1,
  };

  return block;
}

describe('orm - BlockCache', () => {
  it('creation succeeded', done => {
    const TEN = 10;
    const sut = new BlockCache(TEN);
    done();
  });

  it('empty cache -> isCached("1") -> false', done => {
    const sut = new BlockCache(10);

    const BLOCK_HEIGHT = String(1);
    expect(sut.get(BLOCK_HEIGHT)).toBeUndefined();
    done();
  });

  it('empty cache -> add block "1" -> isCached("1") -> true', done => {
    const sut = new BlockCache(10);

    const height1 = createBlock(String(1));
    sut.push(height1);

    expect(sut.get(String(1))).toEqual(height1);
    done();
  });

  it('empty cache -> add block "0" -> isCached("0") -> true', done => {
    const sut = new BlockCache(10);

    const height0 = createBlock(String(0));
    sut.push(height0);

    expect(sut.isCached(String(0))).toEqual(true);

    expect(sut.cachedHeightRange).toEqual({
      max: String(0),
      min: String(0),
    });
    done();
  });

  it('throws if not subsequent blocks are added', done => {
    const sut = new BlockCache(10);

    const height1000 = createBlock(String(1000));
    const height1002 = createBlock(String(1002));

    sut.push(height1000);
    expect(() => sut.push(height1002)).toThrowError(
      new RegExp('^invalid block height', 'i')
    );

    done();
  });

  it('throws if two times the same block was added', done => {
    const sut = new BlockCache(10);

    const height11 = createBlock(String(11));

    sut.push(height11);
    expect(() => sut.push(height11)).toThrowError(
      new RegExp('^invalid block height', 'i')
    );

    done();
  });

  it('throws if "smaller" block is added', done => {
    const sut = new BlockCache(10);

    const height1000 = createBlock(String(1000));
    const height999 = createBlock(String(999));

    sut.push(height1000);
    expect(() => sut.push(height999)).toThrowError(
      new RegExp('^invalid block height', 'i')
    );
    done();
  });

  it('throws if no integer is provided in the constructor', done => {
    const someWrongVariable: any = 't';
    expect(() => new BlockCache(someWrongVariable)).toThrow(
      'please provide a positive integer'
    );
    done();
  });
  it('throws if no positive integer is provided in the constructor', done => {
    const size_zero: number = 0;
    expect(() => new BlockCache(size_zero)).toThrow(
      'please provide a positive integer'
    );

    const size_minus_one: number = -1;
    expect(() => new BlockCache(size_minus_one)).toThrow(
      'please provide a positive integer'
    );
    done();
  });

  it('cachedHeightRange is min: "-1", max: "-1" after initialization', done => {
    const sut = new BlockCache(10);
    const expected = {
      min: String(-1),
      max: String(-1),
    };
    expect(sut.cachedHeightRange).toEqual(expected);
    done();
  });

  it('cachedHeightRange should be min: 7, max: 15, when added block(15) after 0..15 blocks are cached, BlockCache(10)', done => {
    const sut = new BlockCache(10);
    const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    expect(sut.get(String(15))).toBeTruthy();
    expect(sut.get(String(6))).toBeTruthy();

    expect(sut.get(String(5))).toBeFalsy();

    expect(sut.cachedHeightRange).toEqual({
      max: String(15),
      min: String(6),
    });
    done();
  });

  it('cachedHeightRange should be min: 0, max: 9, when added block(9) after 0..9 blocks are cached, BlockCache(10)', done => {
    const sut = new BlockCache(10);
    const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    expect(sut.cachedHeightRange).toEqual({
      min: String(0),
      max: String(9),
    });

    done();
  });

  it('BlockCache(3) can have max 3 items in it', done => {
    const sut = new BlockCache(3);
    const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    expect(sut.get(String(10))).toBeTruthy();
    expect(sut.get(String(9))).toBeTruthy();
    expect(sut.get(String(8))).toBeTruthy();

    expect(sut.get(String(7))).toBeFalsy();

    expect(sut.cachedHeightRange).toEqual({
      max: String(10),
      min: String(8),
    });
    done();
  });

  it('BlockCache(1) can have max 1 item in it', done => {
    const sut = new BlockCache(1);
    const heights = [55, 56, 57, 58, 59];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    expect(sut.get(String(59))).toBeTruthy();

    expect(sut.get(String(58))).toBeFalsy();
    expect(sut.get(String(57))).toBeFalsy();
    expect(sut.get(String(56))).toBeFalsy();
    expect(sut.get(String(55))).toBeFalsy();

    expect(sut.cachedHeightRange).toEqual({
      max: String(59),
      min: String(59),
    });

    done();
  });

  it('cachedHeightRange should be min: 12, max: 12, after only block(12) was added, BlockCache(10)', done => {
    const sut = new BlockCache(10);
    const height_12 = createBlock(String(12));

    sut.push(height_12);
    const expected = {
      min: String(12),
      max: String(12),
    };

    expect(sut.cachedHeightRange).toEqual(expected);
    done();
  });

  it('get(10) should return undefined when BlockCache(size: 2) after push(11) and push(12)', done => {
    const sut = new BlockCache(2);

    const height_10 = createBlock(String(10));
    const height_11 = createBlock(String(11));
    const height_12 = createBlock(String(12));

    sut.push(height_10);
    sut.push(height_11);
    sut.push(height_12);

    expect(sut.get(String(10))).toBeUndefined();
    done();
  });

  it('getById returns undefined if blockId was not found', done => {
    const sut = new BlockCache(10);

    expect(sut.getById('4jpwmCTt136j')).toBeUndefined();
    done();
  });

  it('getById returns correct Block after Block was cached', done => {
    const sut = new BlockCache(10);

    const height_2 = createBlock(String(2));
    sut.push(height_2);
    expect(sut.getById(height_2.id)).toEqual(height_2);
    done();
  });

  it('pass invalid blockId to getById() -> returns undefined', done => {
    const sut = new BlockCache(10);
    expect(sut.getById(undefined)).toBeUndefined();
    done();
  });

  it('can cache Block(0) (genesisBlock)', done => {
    const sut = new BlockCache(10);
    const block_zero = createBlock(String(0));
    sut.push(block_zero);

    expect(sut.get(String(0))).toEqual(block_zero);
    done();
  });

  it('evitUntil(rollback) - WARNING after rolling back to last block, we can start another height', done => {
    const sut = new BlockCache(10);
    const heights = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    // rollback to first block
    sut.evitUntil(String(5));

    const height9 = createBlock(String(9));
    sut.push(height9);

    done();
  });

  it('evitUntil(rollback) rollback to height', done => {
    const sut = new BlockCache(10);
    const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    sut.evitUntil(String(10));

    // this blocks got deleted from cache
    expect(sut.get(String(11))).toBeFalsy();
    expect(sut.get(String(12))).toBeFalsy();
    expect(sut.get(String(13))).toBeFalsy();
    expect(sut.get(String(14))).toBeFalsy();
    expect(sut.get(String(15))).toBeFalsy();

    // only the following blocks are cached: 10, 9, 8, 7
    expect(sut.get(String(10))).toBeTruthy();
    expect(sut.get(String(9))).toBeTruthy();
    expect(sut.get(String(8))).toBeTruthy();
    expect(sut.get(String(7))).toBeTruthy();
    expect(sut.get(String(6))).toBeTruthy();

    // block 5 should not be cached
    expect(sut.get(String(5))).toBeFalsy();

    expect(sut.cachedHeightRange).toEqual({
      max: String(10),
      min: String(6),
    });
    done();
  });

  it('evitUntil(rollback) try to rollback to before first block -> rollsback to minHeight block', done => {
    const sut = new BlockCache(10);
    const heights = [80, 81, 82, 83, 84, 85, 86, 87, 88, 89];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    sut.evitUntil(String(77));

    // only block 80 is left in cache
    expect(sut.get(String(80))).toBeTruthy();

    // block 81 and 79 are deleted
    expect(sut.get(String(81))).toBeFalsy();
    expect(sut.get(String(79))).toBeFalsy();

    done();
  });

  it.skip('evitUntil(rollback) rollback to first block', done => {
    const sut = new BlockCache(10);
    const heights = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    sut.evitUntil(String(20));

    expect(sut.cachedHeightRange).toEqual({
      min: String(20),
      max: String(20),
    });

    done();
  });

  it.skip('evitUntil(rollback) rollback to height "0" (Part 3)', done => {
    const sut = new BlockCache(10);
    const heights = [0, 1, 2, 3, 4, 5];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    sut.evitUntil(String(0));

    expect(sut.get(String(0))).toBeTruthy();
    expect(sut.cachedHeightRange).toEqual({
      min: String(0),
      max: String(0),
    });
    done();
  });

  it.skip('evitUntil(rollback) what happens when rolling back greater then the cache???', done => {
    const sut = new BlockCache(10);
    const heights = [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
    ];

    heights.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    sut.evitUntil(String(5));

    expect(sut.cachedHeightRange).toEqual({
      min: String(0),
      max: String(0),
    });

    done();
  });

  it.skip('evitUntil(rollback) rollback to first block then start adding again blocks', done => {
    const sut = new BlockCache(10);

    const heightsBefore = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39];
    heightsBefore.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    // evit until first block
    sut.evitUntil(String(30));

    // add again blocks
    const heightsAfter = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
    heightsAfter.forEach(one => {
      const block = createBlock(String(one));
      sut.push(block);
    });

    expect(sut.get(String(31))).toBeTruthy();
    expect(sut.cachedHeightRange).toEqual({
      max: String(40),
      min: String(31),
    });

    done();
  });
});
