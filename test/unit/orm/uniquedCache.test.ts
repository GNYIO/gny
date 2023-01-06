import { UniquedCache } from '@gny/database-postgres';
import { LRUEntityCache } from '@gny/database-postgres';
import { ModelSchema, MetaSchema } from '@gny/database-postgres';
import { CustomCache } from '@gny/database-postgres';

describe('orm UniquedCache', () => {
  let sut: UniquedCache;
  beforeEach(() => {
    const metaSchema: MetaSchema = {
      memory: false,
      name: 'Account',
      indices: [
        {
          isUnique: false,
          columns: [
            {
              propertyName: 'address',
            },
          ],
        },
        {
          isUnique: true,
          columns: [
            {
              propertyName: 'username',
            },
          ],
        },
      ],
      columns: [
        {
          name: 'address',
        },
        {
          name: 'username',
        },
      ],
    };
    const modelSchema = new ModelSchema(metaSchema);
    const cache = new CustomCache(
      modelSchema,
      LRUEntityCache.DEFULT_MAX_CACHED_COUNT
    );

    const modelIndex = modelSchema.allUniqueIndexes;
    sut = new UniquedCache(cache, modelIndex);
  });

  afterEach(() => {
    sut = undefined;
  });

  it('properties are correctly set', done => {
    // @ts-ignore
    expect(sut.cache).toBeTruthy();
    // @ts-ignore
    expect(sut.indexes).toBeTruthy();
    // @ts-ignore
    expect(sut.indexes.size).toBe(1);
    done();
  });
  it('empty -> set(key, item) -> get(key) returns item', done => {
    const key = JSON.stringify({ address: 'G2yS6YgA77kNy92tc1qQax3JgE6rq' });
    const value = {
      address: 'G2yS6YgA77kNy92tc1qQax3JgE6rq',
      username: null,
      gny: 0,
      isDelegate: 0,
      isLocked: 0,
      lockHeight: 0,
      lockAmount: 0,
      version: 1,
    };
    sut.set(key, value);

    expect(sut.get(key)).toBe(value);
    done();
  });
  it('empty -> set(item) -> returns undefined', done => {
    const key = JSON.stringify({ address: 'G4LH3SBrTWcPiQbV2FPjibWVtJKn9' });
    expect(sut.get(key)).toBeUndefined();
    done();
  });
  it('getUniqued()', done => {
    const key = JSON.stringify({ address: 'G2Av9Fzma9svmj8hD1X76Ar5FHY1z' });

    sut.set(key, {
      address: 'G2Av9Fzma9svmj8hD1X76Ar5FHY1z',
      username: 'gny_d1',
      gny: 700000,
    });

    const uniqueColumnName = 'username';
    const uniqueColumnValue = { username: 'gny_d1' };
    const result = sut.getUnique(uniqueColumnName, uniqueColumnValue);
    expect(result).toEqual({
      address: 'G2Av9Fzma9svmj8hD1X76Ar5FHY1z',
      username: 'gny_d1',
      gny: 700000,
    });

    done();
  });
  it('update cached item', done => {
    const key = JSON.stringify({ address: 'G4X3t9GWrPU65U3nZzqR6z5LQdfP1' });
    const value = {
      address: 'G4X3t9GWrPU65U3nZzqR6z5LQdfP1',
      isDelegate: 0,
    };

    sut.set(key, value);

    value.isDelegate = 1; // change

    sut.set(key, value);

    const expectedResult = {
      address: 'G4X3t9GWrPU65U3nZzqR6z5LQdfP1',
      isDelegate: 1,
    };
    expect(sut.get(key)).toEqual(expectedResult);

    done();
  });
  it('clear() all items', done => {
    const key1 = JSON.stringify({ address: 'G3oCLYRv6Z9AzD35w8RvbpNeWqpvL' });
    const key2 = JSON.stringify({ address: 'G2yY6XpLzt1Zx69QJX1t6mhJeGZyH' });
    const value1 = {
      address: 'G3oCLYRv6Z9AzD35w8RvbpNeWqpvL',
      gny: 3000000000,
    };
    const value2 = {
      address: 'G2yY6XpLzt1Zx69QJX1t6mhJeGZyH',
      gny: 20000000,
    };
    sut.set(key1, value1);
    sut.set(key2, value2);

    expect(sut.get(key1)).toBe(value1);
    expect(sut.get(key2)).toBe(value2);

    sut.clear();

    expect(sut.get(key1)).toBeUndefined();
    expect(sut.get(key2)).toBeUndefined();

    done();
  });
  it('max cached items', done => {
    const customMetaSchema: MetaSchema = {
      memory: false,
      name: 'Account',
      indices: [
        {
          isUnique: false,
          columns: [
            {
              propertyName: 'address',
            },
          ],
        },
        {
          isUnique: true,
          columns: [
            {
              propertyName: 'username',
            },
          ],
        },
      ],
      columns: [
        {
          name: 'address',
        },
        {
          name: 'username',
        },
      ],
    };
    const modelSchema = new ModelSchema(customMetaSchema);

    const customCache = new CustomCache(modelSchema, 1);
    const customModelIndex = modelSchema.uniqueIndexes;

    const custom = new UniquedCache(customCache, customModelIndex);

    custom.set('test', { hello: 2 });
    expect(custom.get('test')).toEqual({ hello: 2 });

    custom.set('second', { x: 4 });
    expect(custom.get('test')).toBeUndefined();

    done();
  });
});
