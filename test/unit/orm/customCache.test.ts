import { CustomCache } from '../../../packages/database-postgres/src/customCache';

describe('orm - CustomCache', () => {
  let modelSchema: any;
  let size: number;
  beforeEach(() => {
    modelSchema = {
    };
    size = 5000;
  });
  it('creating works', (done) => {
    const sut = new CustomCache(modelSchema, size);
    done();
  });
  it('onEvit() executes registered callback', (done) => {
    const sut = new CustomCache(modelSchema, size);
    const callBack = (key: string, obj: Object) => {
      expect(key).toEqual('key');
      expect(obj).toEqual({ hello: 1 });
      done(); // callback was called
    };

    sut.onEvit = callBack;
    sut.onEvit('key', { hello: 1 });
  });
  it('test max cache, size 2, add 3 items, first should not be there', (done) => {
    const sut = new CustomCache(modelSchema, 2);

    const key1 = '{"address":"1"}';
    const key2 = '{"address":"2"}';
    const key3 = '{"address":"3"}';

    const val1 = { address: 1, gny: 1 };
    const val2 = { address: 2, gny: 2 };
    const val3 = { address: 3, gny: 3 };

    sut.set(key1, val1);
    sut.set(key2, val2);
    sut.set(key3, val3);

    expect(sut.get(key1)).toBeUndefined();
    expect(sut.get(key2)).toBeTruthy();
    expect(sut.get(key3)).toBeTruthy();
    done();
  });
  it('forEach returns every item that is available', (done) => {
    const sut = new CustomCache(modelSchema, 10);

    sut.set('key1', { hello: 1 });
    sut.set('key2', { hello: 2 });

    let called = 0;
    const result = [];

    sut.forEach((value: Object, key: string) => {
      result.push({ value, key });
      ++called;
    });

    expect(called).toEqual(2);
    expect(result).toEqual([{
      value: { hello: 2 },
      key: 'key2'
    }, {
      value: { hello: 1 },
      key: 'key1',
    }]);
    done();
  });
  it('empty cache -> exists() -> returns false', (done) => {
    const sut = new CustomCache(modelSchema, 10);

    expect(sut.exists('key1')).toEqual(false);
    done();
  });
  it('add item(key) -> exists(key) -> returns true', (done) => {
    const sut = new CustomCache(modelSchema, 10);

    sut.set('key1', { hello: 1 });
    expect(sut.exists('key1')).toEqual(true);
    done();
  });
  it('evit item', (done) => {
    const sut = new CustomCache(modelSchema, 10);

    const key1 = '{"address":"1"}';
    const key2 = '{"address":"2"}';

    const val1 = { address: 1, gny: 1 };
    const val2 = { address: 2, gny: 2 };

    sut.set(key1, val1);
    sut.set(key2, val2);

    sut.evit(key1);

    expect(sut.get(key1)).toBeUndefined();
    expect(sut.get(key2)).toBeTruthy();

    done();
  });
  it('clear all items', (done) => {
    const sut = new CustomCache(modelSchema, 10);

    const key1 = '{"address":"1"}';
    const key2 = '{"address":"2"}';

    const val1 = { address: 1, gny: 1 };
    const val2 = { address: 2, gny: 2 };

    sut.set(key1, val1);
    sut.set(key2, val2);

    sut.clear();

    expect(sut.get(key1)).toBeUndefined();
    expect(sut.get(key2)).toBeUndefined();

    done();
  });
  // exist() and has() are doing the same thing
});
