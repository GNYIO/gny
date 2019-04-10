import { LimitCache } from '../../../src/utils/limit-cache';

describe('LimitCache', () => {
  let sut: LimitCache<string, boolean>;
  beforeEach(done => {
    sut = new LimitCache<string, boolean>();
    done();
  });
  afterEach(done => {
    sut = undefined;
    done();
  });

  it('has() - empty should return false', done => {
    const result = sut.has('failedTrs1');
    expect(result).toEqual(false);
    done();
  });

  it('getLimit() - is default 10.000', done => {
    const result = sut.getLimit();

    expect(result).toEqual(10000);
    done();
  });

  it('getLimit() - configure limit', done => {
    const LIMIT = 5;
    const customSut = new LimitCache<string, boolean>(LIMIT);
    const result = customSut.getLimit();

    expect(result).toEqual(LIMIT);
    done();
  });

  it('has() - added key, then has() returns true', done => {
    const customSut = new LimitCache<string, boolean>(3);

    customSut.set('failedTrs1', true);

    const result = customSut.has('failedTrs1');
    expect(result).toEqual(true);
    done();
  });

  it('limit 3 - should remove first item if 4 items are added', done => {
    const customSut = new LimitCache<string, boolean>(3);

    customSut.set('failedTrs1', true);
    customSut.set('failedTrs2', true);
    customSut.set('failedTrs3', true);

    // check before set()
    expect(customSut.has('failedTrs1')).toEqual(true);
    expect(customSut.has('failedTrs2')).toEqual(true);
    expect(customSut.has('failedTrs3')).toEqual(true);

    // act
    customSut.set('failedTrs4', true);

    // check after set()
    expect(customSut.has('failedTrs1')).toEqual(false);
    expect(customSut.has('failedTrs2')).toEqual(true);
    expect(customSut.has('failedTrs3')).toEqual(true);
    expect(customSut.has('failedTrs4')).toEqual(true);

    done();
  });

  it('limit 2 - adding value twice should not change something', done => {
    const customSut = new LimitCache<string, boolean>(2);

    // adding twice the same value
    customSut.set('failedTrs1', true);
    customSut.set('failedTrs1', true);
    customSut.set('failedTrs2', true);
    customSut.set('failedTrs3', true);

    const result = customSut.has('failedTrs1');
    expect(result).toEqual(false);

    customSut.set('failedTrs4', true);

    expect(customSut.has('failedTrs2')).toEqual(false);
    expect(customSut.has('failedTrs3')).toEqual(true);
    expect(customSut.has('failedTrs4')).toEqual(true);

    done();
  });
});
