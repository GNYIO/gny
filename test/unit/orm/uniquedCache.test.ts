
import { UniquedCache, ModelIndex } from '../../../packages/database-postgres/src/defaultEntityUniqueIndex';
import { CustomCache, LRUEntityCache } from '../../../packages/database-postgres/src/lruEntityCache';
import { ModelSchema } from '../../../packages/database-postgres/src/modelSchema';

describe('orm UniquedCache', () => {
  let sut: UniquedCache;
  beforeEach(() => {
    const oldSchema = {
      meta: {
        memory: true,
      },
    };
    const modelSchema = new ModelSchema(oldSchema, 'Delegate');
    const cache = new CustomCache(modelSchema, LRUEntityCache.DEFULT_MAX_CACHED_COUNT);
    const modelIndex: ModelIndex = {
      name: 'username',
      properties: ['username'],
    };
    sut = new UniquedCache(cache, [modelIndex]);
  });

  afterEach(() => {
    sut = undefined;
  });

  it('properties are correctly set', (done) => {
    expect(sut.cache).toBeTruthy();
    expect(sut.indexes).toBeTruthy();
    expect(sut.indexes.size).toBe(1);
    done();
  });
  it('empty -> set(key, item) -> get(key) returns item', (done) => {
    const key = JSON.stringify({ address: 'G2yS6YgA77kNy92tc1qQax3JgE6rq' });
    const value = {
      address: 'G2yS6YgA77kNy92tc1qQax3JgE6rq',
      username: null,
      gny: 0,
      isDelegate: 0,
      isLocked: 0,
      lockHeight: 0,
      lockAmount: 0,
      version: 1
    };
    sut.set(key, value);

    expect(sut.get(key)).toBe(value);
    done();
  });
  it('empty -> set(item) -> returns undefined', (done) => {
    const key = JSON.stringify({ address: 'G4LH3SBrTWcPiQbV2FPjibWVtJKn9' });
    expect(sut.get(key)).toBeUndefined();
    done();
  });
  it.skip('test max cached items', (done) => {
    done();
  });
});