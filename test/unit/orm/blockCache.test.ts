
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
});