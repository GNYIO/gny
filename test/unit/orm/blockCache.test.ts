
import { BlockCache } from '../../../packages/database-postgres/src/blockCache';
import { Block } from '../../../packages/database-postgres/entity/Block';
import { randomBytes } from 'crypto';

function createRandomBytes(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

function createBlock(height: number) {
  const block: Block = {
    height: height,
    version: 0,
    timestamp: height + 2003502305230,
    count: 0,
    fees: 0,
    reward: 0,
    signature: createRandomBytes(64),
    id: createRandomBytes(32),
    transactions: [],
    delegate: createRandomBytes(32),
    payloadHash: createRandomBytes(32),
    _version_: 1,
  };

  return block;
}

describe('orm - BlockCache', () => {
  it('creation succeeded', (done) => {
    const TEN = 10;
    const sut = new BlockCache(TEN);
    done();
  });
  it('empty cache -> isCached(1) -> false', (done) => {
    const sut = new BlockCache(10);

    const BLOCK_HEIGHT = 1;
    expect(sut.get(BLOCK_HEIGHT)).toBeUndefined();
    done();
  });
  it('empty cache -> add block 1 -> isCached(1) -> true', (done) => {
    const sut = new BlockCache(10);

    const height1 = createBlock(1);
    sut.push(height1);

    expect(sut.get(1)).toEqual(height1);
    done();
  });
  it('throws if not subsequent blocks are added', (done) => {
    const sut = new BlockCache(10);

    const height1000 = createBlock(1000);
    const height1002 = createBlock(1002);

    sut.push(height1000);
    expect(() => sut.push(height1002)).toThrowError(new RegExp('^invalid block height', 'i'));

    done();
  });
  it('throws if no integer is provided in the constructor', (done) => {
    const someWrongVariable: any = 't';
    expect(() => new BlockCache(someWrongVariable)).toThrow('please provide a positive integer');
    done();
  });
  it('throws if no positive integer is provided in the constructor', (done) => {
    const size_zero: number = 0;
    expect(() => new BlockCache(size_zero)).toThrow('please provide a positive integer');

    const size_minus_one: number = -1;
    expect(() => new BlockCache(size_minus_one)).toThrow('please provide a positive integer');
    done();
  });
  it('cachedHeightRange is min: -1, max: -1 after initialization', (done) => {
    const sut = new BlockCache(10);
    const expected = {
      min: -1,
      max: -1,
    };
    expect(sut.cachedHeightRange).toEqual(expected);
    done();
  });
  it('cachedHeightRange should be min: 7, max: 15, when added block(15) after 0::15 blocks are cached, BlockCache(10)', (done) => {
    const sut = new BlockCache(10);
    const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    heights.forEach((one) => {
      const block = createBlock(one);
      sut.push(block);
    });

    const expected = {
      min: 7,
      max: 15,
    };
    expect(sut.cachedHeightRange).toEqual(expected);
    done();
  });
  it('cahedHeightRange should be min: 12, max: 12, after only block(12) was added, BlockCache(10)', (done) => {
    const sut = new BlockCache(10);
    const height_12 = createBlock(12);

    sut.push(height_12);
    const expected = {
      min: 12,
      max: 12,
    };

    expect(sut.cachedHeightRange).toEqual(expected);
    done();
  });
  it('get(10) should return undefined when BlockCache(size: 2) after push(11) and push(12)', (done) => {
    const sut = new BlockCache(2);

    const height_10 = createBlock(10);
    const height_11 = createBlock(11);
    const height_12 = createBlock(12);

    sut.push(height_10);
    sut.push(height_11);
    sut.push(height_12);

    expect(sut.get(10)).toBeUndefined();
    done();
  });
  it('getById returns undefined if blockId was not found', (done) => {
    const sut = new BlockCache(10);

    expect(sut.getById('4jpwmCTt136j')).toBeUndefined();
    done();
  });
  it('getById returns correct Block after Block was cached', (done) => {
    const sut = new BlockCache(10);

    const height_2 = createBlock(2);
    sut.push(height_2);
    expect(sut.getById(height_2.id)).toEqual(height_2);
    done();
  });
  it('pass invalid blockId to getById() -> returns undefined', (done) => {
    const sut = new BlockCache(10);
    expect(sut.getById(undefined)).toBeUndefined();
    done();
  });
  it('can cache Block(0) (genesisBlock)', (done) => {
    const sut = new BlockCache(10);
    const block_zero = createBlock(0);
    sut.push(block_zero);

    expect(sut.get(0)).toEqual(block_zero);
    done();
  });
  it('evitUntil', (done) => {
    const sut = new BlockCache(10);
    const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    heights.forEach((one) => {
      const block = createBlock(one);
      sut.push(block);
    });

    sut.evitUntil(10);
    expect(sut.get(9)).toBeTruthy();
    expect(sut.get(10)).toBeTruthy();
    expect(sut.get(11)).toBeUndefined();
    expect(sut.cachedHeightRange).toEqual({ min: 7, max: 10 });
    done();
  });
});