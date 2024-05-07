import {
  urlRegex as re,
  datMakerRegex,
  datNameOnlyRegex,
  datNameRegex,
} from '@gnyio/utils';

describe('url', () => {
  it('validate urlRegex', () => {
    // "?:" makes a non-capture group
    // ".*?" is a non-greedy match all

    /* happy path */
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

    /* sad path */
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

  it('validate datMakerRegex', () => {
    /* happy path */
    // beginning with lowercase char
    expect(datMakerRegex.test('a')).toEqual(true);
    // beginning with uppercase char
    expect(datMakerRegex.test('A')).toEqual(true);
    // beginning with underscore
    expect(datMakerRegex.test('_')).toEqual(true);
    // 30 characters long
    expect(datMakerRegex.test('A'.repeat(30))).toEqual(true);
    // beginning with letter and than number
    expect(datMakerRegex.test('A9')).toEqual(true);

    /* sad path */
    expect(datMakerRegex.test('')).toEqual(false);
    // @ts-ignore
    expect(datMakerRegex.test(null)).toEqual(false);
    // @ts-ignore
    expect(datMakerRegex.test(undefined)).toEqual(false);
    // beginning with number
    expect(datMakerRegex.test('9')).toEqual(false);
    // 31 characters long
    expect(datMakerRegex.test('A'.repeat(31))).toEqual(false);
  });

  it('validate datNameOnlyRegex', () => {
    /* happy path */
    expect(datNameOnlyRegex.test('_'.repeat(5))).toEqual(true);
    expect(datNameOnlyRegex.test('1'.repeat(5))).toEqual(true);
    expect(datNameOnlyRegex.test('a'.repeat(5))).toEqual(true);
    expect(datNameOnlyRegex.test('A'.repeat(5))).toEqual(true);

    /* sad path */
    expect(datNameOnlyRegex.test('')).toEqual(false);
    // @ts-ignore
    expect(datNameOnlyRegex.test(null)).toEqual(false);
    expect(
      // @ts-ignore
      datNameOnlyRegex.test(undefined)
    ).toEqual(false);
    // names that are 4 characters or shorter will fail
    expect(datNameOnlyRegex.test('A'.repeat(4))).toEqual(false);
    // names that are longer than 41 characters will fail
    expect(datNameOnlyRegex.test('A'.repeat(40))).toEqual(false);
  });

  it('validate datNameRegex', () => {
    /* happy path */
    expect(datNameRegex.test('MAKER.NAME1')).toEqual(true);

    /* sad path */
    expect(datNameRegex.test('')).toEqual(false);
    // @ts-ignore
    expect(datNameRegex.test(null)).toEqual(false);
    // @ts-ignore
    expect(datNameRegex.test(undefined)).toEqual(false);
    // two dots
    expect(datNameRegex.test('A.AAAAA.A')).toEqual(false);
    // no dot
    expect(datNameRegex.test('A'.repeat(10))).toEqual(false);
    // too short
    expect(datNameRegex.test('A'.repeat(1))).toEqual(false);
    expect(datNameRegex.test('A'.repeat(2))).toEqual(false);
    expect(datNameRegex.test('A'.repeat(3))).toEqual(false);
    expect(datNameRegex.test('A'.repeat(4))).toEqual(false);
    expect(datNameRegex.test('A'.repeat(5))).toEqual(false);
    // too long (72 characters long)
    expect(
      datNameRegex.test('A'.repeat(30) + '.' + 'A'.repeat(40) + 'A')
    ).toEqual(false);
    // after first dot nothing
    expect(datNameRegex.test('A'.repeat(30) + '.')).toEqual(false);
    // only dots
    expect(datNameRegex.test('.'.repeat(7))).toEqual(false);
    // dot, ten text
    expect(datNameRegex.test('.' + 'A'.repeat(5))).toEqual(false);
  });
});
