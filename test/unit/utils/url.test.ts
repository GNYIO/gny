import { urlRegex as re } from '@gny/utils';

describe('url', () => {
  it('validate urlRegex', () => {
    // "?:" makes a non-capture group
    // ".*?" is a non-greedy match all

    // should be valid urls
    expect(re.test('https://a.b.c.test.com')).toEqual(true);
    expect(re.test('https://test.com')).toEqual(true);
    expect(re.test('https://test.com')).toEqual(true);
    expect(re.test('https://test.com/y')).toEqual(true);
    expect(re.test('https://test.com/asdf.com/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json()/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json*s/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json+s/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json$s/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json!s/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json-s/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json_s/')).toEqual(true);
    expect(re.test('https://test.com/asdf/dfsdf/api.json%20s/')).toEqual(true);
    expect(re.test('https://test.com/?x=x')).toEqual(true);
    expect(re.test('https://test.com?x=x')).toEqual(true);
    expect(re.test('https://test.com/abc/def/?x=x')).toEqual(true);
    expect(re.test('https://test.com/abc/?aaa=bbb')).toEqual(true);
    expect(re.test('https://test.com/api?x=x')).toEqual(true);
    expect(re.test('https://test.com/api/?abc=def&xyz=def')).toEqual(true);
    expect(re.test('https://test.com/api/?abc=def&xyz=d%20f')).toEqual(true);

    // should not be valid urls
    expect(re.test('test.com')).toEqual(false);
    expect(re.test('com')).toEqual(false);
    expect(re.test('su.test.com')).toEqual(false);
    expect(re.test('.test.com')).toEqual(false);
    expect(re.test('test.com.')).toEqual(false);
    expect(re.test('su..test.com.')).toEqual(false);
    expect(re.test('su.test..com.')).toEqual(false);
    expect(re.test('https://test.com/?')).toEqual(false);
    expect(re.test('https://test.com/?x')).toEqual(false);
    expect(re.test('https://test.com/?x=')).toEqual(false);
    expect(re.test('https://test.com/??')).toEqual(false);
    expect(re.test('https://test.com/?=')).toEqual(false);
    expect(re.test('https://test.com/?#')).toEqual(false);
    expect(re.test('https://test.com/?&')).toEqual(false);
    expect(re.test('https://test.com/?x?')).toEqual(false);
    expect(re.test('https://test.com/?x=?')).toEqual(false);
    expect(re.test('https://test.com/?x=&')).toEqual(false);
    expect(re.test('https://test.com/?x=#')).toEqual(false);
    expect(re.test('https://test.com/?x==')).toEqual(false);
    expect(re.test('https://test.com/?x=x&')).toEqual(false);
    expect(re.test('https://test.com/?x=x&a')).toEqual(false);
    expect(re.test('https://test.com/?x=x=')).toEqual(false);
  });
});
