import { isUrl, isDatMaker, isDatNameOnly, isDatName } from '@gnyio/utils';

describe('url', () => {
  it('validate urlRegex', () => {
    // "?:" makes a non-capture group
    // ".*?" is a non-greedy match all

    /* happy path */
    expect(isUrl('https://a.b.c.test.com')).toEqual(true);
    expect(isUrl('https://test.com')).toEqual(true);
    expect(isUrl('https://test.com')).toEqual(true);
    expect(isUrl('https://test.com/y')).toEqual(true);
    expect(isUrl('https://test.com/asdf.com/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json()/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json*s/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json+s/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json$s/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json!s/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json-s/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json_s/')).toEqual(true);
    expect(isUrl('https://test.com/asdf/dfsdf/api.json%20s/')).toEqual(true);
    expect(isUrl('https://test.com/?x=x')).toEqual(true);
    expect(isUrl('https://test.com?x=x')).toEqual(true);
    expect(isUrl('https://test.com/abc/def/?x=x')).toEqual(true);
    expect(isUrl('https://test.com/abc/?aaa=bbb')).toEqual(true);
    expect(isUrl('https://test.com/api?x=x')).toEqual(true);
    expect(isUrl('https://test.com/api/?abc=def&xyz=def')).toEqual(true);
    expect(isUrl('https://test.com/api/?abc=def&xyz=d%20f')).toEqual(true);

    // 255 length (should pass)
    const value255 =
      'https://test.com/?x=' + 'a'.repeat(255 - 'https://test.com/?x='.length);
    expect(isUrl(value255)).toEqual(true);

    /* sad path */
    expect(isUrl('test.com')).toEqual(false);
    expect(isUrl('com')).toEqual(false);
    expect(isUrl('su.test.com')).toEqual(false);
    expect(isUrl('.test.com')).toEqual(false);
    expect(isUrl('test.com.')).toEqual(false);
    expect(isUrl('su..test.com.')).toEqual(false);
    expect(isUrl('su.test..com.')).toEqual(false);
    expect(isUrl('https://test.com/?')).toEqual(false);
    expect(isUrl('https://test.com/?x')).toEqual(false);
    expect(isUrl('https://test.com/?x=')).toEqual(false);
    expect(isUrl('https://test.com/??')).toEqual(false);
    expect(isUrl('https://test.com/?=')).toEqual(false);
    expect(isUrl('https://test.com/?#')).toEqual(false);
    expect(isUrl('https://test.com/?&')).toEqual(false);
    expect(isUrl('https://test.com/?x?')).toEqual(false);
    expect(isUrl('https://test.com/?x=?')).toEqual(false);
    expect(isUrl('https://test.com/?x=&')).toEqual(false);
    expect(isUrl('https://test.com/?x=#')).toEqual(false);
    expect(isUrl('https://test.com/?x==')).toEqual(false);
    expect(isUrl('https://test.com/?x=x&')).toEqual(false);
    expect(isUrl('https://test.com/?x=x&a')).toEqual(false);
    expect(isUrl('https://test.com/?x=x=')).toEqual(false);

    // 256 length (should fail)
    const value256 =
      'https://test.com/?x=' + 'a'.repeat(256 - 'https://test.com/?x='.length);
    expect(isUrl(value256)).toEqual(false);
  });

  it('validate datMakerRegex', () => {
    /* happy path */
    // beginning with lowercase char
    expect(isDatMaker('a')).toEqual(true);
    // beginning with uppercase char
    expect(isDatMaker('A')).toEqual(true);
    // beginning with underscore
    expect(isDatMaker('_')).toEqual(true);
    // 30 characters long
    expect(isDatMaker('A'.repeat(30))).toEqual(true);
    // beginning with letter and than number
    expect(isDatMaker('A9')).toEqual(true);

    /* sad path */
    expect(isDatMaker('')).toEqual(false);
    // @ts-ignore
    expect(isDatMaker(null)).toEqual(false);
    // @ts-ignore
    expect(isDatMaker(undefined)).toEqual(false);
    // beginning with number
    expect(isDatMaker('9')).toEqual(false);
    // 31 characters long
    expect(isDatMaker('A'.repeat(31))).toEqual(false);
  });

  it('validate datNameOnlyRegex', () => {
    /* happy path */
    expect(isDatNameOnly('_'.repeat(5))).toEqual(true);
    expect(isDatNameOnly('1'.repeat(5))).toEqual(true);
    expect(isDatNameOnly('a'.repeat(5))).toEqual(true);
    expect(isDatNameOnly('A'.repeat(5))).toEqual(true);

    /* sad path */
    expect(isDatNameOnly('')).toEqual(false);
    // @ts-ignore
    expect(isDatNameOnly(null)).toEqual(false);
    expect(
      // @ts-ignore
      isDatNameOnly(undefined)
    ).toEqual(false);
    // names that are 4 characters or shorter will fail
    expect(isDatNameOnly('A'.repeat(4))).toEqual(false);
    // names that are longer than 41 characters will fail
    expect(isDatNameOnly('A'.repeat(41))).toEqual(false);
  });

  it('validate datNameRegex', () => {
    /* happy path */
    expect(isDatName('MAKER.NAME1')).toEqual(true);

    /* sad path */
    expect(isDatName('')).toEqual(false);
    // @ts-ignore
    expect(isDatName(null)).toEqual(false);
    // @ts-ignore
    expect(isDatName(undefined)).toEqual(false);
    // two dots
    expect(isDatName('A.AAAAA.A')).toEqual(false);
    // no dot
    expect(isDatName('A'.repeat(10))).toEqual(false);
    // too short
    expect(isDatName('A'.repeat(1))).toEqual(false);
    expect(isDatName('A'.repeat(2))).toEqual(false);
    expect(isDatName('A'.repeat(3))).toEqual(false);
    expect(isDatName('A'.repeat(4))).toEqual(false);
    expect(isDatName('A'.repeat(5))).toEqual(false);
    // too long (72 characters long)
    expect(isDatName('A'.repeat(30) + '.' + 'A'.repeat(40) + 'A')).toEqual(
      false
    );
    // after first dot nothing
    expect(isDatName('A'.repeat(30) + '.')).toEqual(false);
    // only dots
    expect(isDatName('.'.repeat(7))).toEqual(false);
    // dot, ten text
    expect(isDatName('.' + 'A'.repeat(5))).toEqual(false);
  });
});
