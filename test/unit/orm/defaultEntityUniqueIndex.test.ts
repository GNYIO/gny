import { DefaultEntityUniqueIndex } from '@gny/database-postgres';

describe('orm - defaultEntityUniqueIndex', () => {
  it('sets correct properties', done => {
    const sut = new DefaultEntityUniqueIndex('username', ['username']); // system under test
    expect(sut.indexName).toBe('username');
    expect(sut.fields).toEqual(['username']);
    expect(sut.indexMap).toBeInstanceOf(Map);
    expect(sut.indexMap.size).toBe(0);
    done();
  });
  it('add', done => {
    const sut = new DefaultEntityUniqueIndex('tid', ['tid']); // system under test
    const value = {
      tid: 'fb48f557ecfe4f5007a3f0eacde84632bde1db516cb75e8006a62a526aa19147',
    };
    const key = JSON.stringify({ address: 'GM5CevQY3brUyRtDMng5Co41nWHh' });

    sut.add(value, key);

    const expected = new Map<string, string>();
    expected.set(JSON.stringify(value), key);
    expect(sut.indexMap).toEqual(expected);
    done();
  });
  it('add then get', done => {
    const sut = new DefaultEntityUniqueIndex('publicKey', ['publicKey']);
    const value = {
      publicKey:
        '5d5be2685edb3b49c53acc68114e1e3fcf829f0f05a3eb6203642bf3615dc450',
    };
    const key = JSON.stringify({ address: 'GtXXB4qRtwzngLYpHGGLGmbFBCTw' });

    sut.add(value, key);

    const result = sut.get(value);
    expect(result).toEqual(key);
    done();
  });
  it('delete', done => {
    const sut = new DefaultEntityUniqueIndex('username', ['username']);
    const value = { username: 'liangpeili' };
    const key = JSON.stringify({ address: 'G3SXME2YejaCw9a7f8hwi1yCBLEH' });

    sut.add(value, key);
    expect(sut.get(value)).toEqual(key);

    sut.delete(value);
    expect(sut.get(value)).toBeUndefined();
    done();
  });
  it('exists', done => {
    const sut = new DefaultEntityUniqueIndex('username', ['username']);
    const value = { username: 'a1300' };
    const key = JSON.stringify({ address: 'GW25gtEZx43SzWNpn9Ntggv65yTZ' });

    expect(sut.exists(value)).toBeFalsy();

    sut.add(value, key);

    expect(sut.exists(value)).toBeTruthy();

    done();
  });
});
