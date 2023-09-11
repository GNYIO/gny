// import { generateAddress, isAddress } from '@gny/utils';

describe('url', () => {
  describe('is url', () => {
    it('test', () => {
      // "?:" makes a non-capture group
      // ".*?" is a non-greedy match all

      const re = new RegExp(
        /^https:\/\/(?:[-a-zA-Z0-9]{1,256}\.)+?[a-zA-Z0-9]{1,15}(?:\/[-a-zA-Z0-9.()*+$!_%]*?)*?(?:(?:\?([-a-zA-Z0-9.()*+$!_%]+?)=[-a-zA-Z0-9.()*+$!_%]+?)(&[-a-zA-Z0-9.()*+$!_%]+?=[-a-zA-Z0-9.()*+$!_%]+?)*)?$/
      );

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
      expect(re.test('https://test.com/asdf/dfsdf/api.json%20s/')).toEqual(
        true
      );
      expect(re.test('https://test.com/?x=x')).toEqual(true);
      expect(re.test('https://test.com?x=x')).toEqual(true);
      expect(re.test('https://test.com/abc/def/?x=x')).toEqual(true);
      expect(re.test('https://test.com/abc/?aaa=bbb')).toEqual(true);
      expect(re.test('https://test.com/api?x=x')).toEqual(true);
      expect(re.test('https://test.com/api/?abc=def&xyz=def')).toEqual(true);

      const invalidUrls = [
        'test.com',
        'su.test.com',
        '.test.com',
        'test.com.',
        'su..test.com',
        'asdf com',
        'https://test.com/',
        'https://test.com/?',
        'https://test.com/?x',
        'https://test.com/?x=',
        'https://test.com/??',
        'https://test.com/?=',
        'https://test.com/?#',
        'https://test.com/?&',
        'https://test.com/?x?',
        'https://test.com/?x=?',
        'https://test.com/?x=&',
        'https://test.com/?x=#',
        'https://test.com/?x==',
        'https://test.com/?x=x&',
        'https://test.com/?x=x&a',
        'https://test.com/?x=x=',
        'https://test.com/?x=x',
      ];
    });
  });
});
