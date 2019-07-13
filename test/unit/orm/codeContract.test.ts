import * as CodeContract from '../../../packages/database-postgres/src/codeContract';
import { PropertyChange } from '../../../packages/database-postgres/src/basicEntityTracker';

describe('codeContract', () => {
  describe('isPrimitiveKey', () => {
    it('isPrimitiveKey() - returns false for undefined', done => {
      const result = CodeContract.isPrimitiveKey(undefined);
      expect(result).toEqual(false);
      done();
    });

    it('isPrimitiveKey() - returns false for null', done => {
      const result = CodeContract.isPrimitiveKey(null);
      expect(result).toEqual(false);
      done();
    });

    it('isPrimitiveKey() - returns false for an empty object', done => {
      const result = CodeContract.isPrimitiveKey({});
      expect(result).toEqual(false);
      done();
    });

    it('isPrimitiveKey() - returns true for an empty string', done => {
      const result = CodeContract.isPrimitiveKey('');
      expect(result).toEqual(true);
      done();
    });

    it('isPrimitiveKey() - returns true for ordinary string', done => {
      const result = CodeContract.isPrimitiveKey('hello');
      expect(result).toEqual(true);
      done();
    });

    it('isPrimitiveKey() - returns true for ordinary number', done => {
      const result = CodeContract.isPrimitiveKey(124);
      expect(result).toEqual(true);
      done();
    });
  });

  describe('partialCopy', () => {
    it('partialCopy() - returns new object with selected properties', done => {
      const start = {
        a: 1,
        b: 'hello',
        c: 'world',
      };
      const properties = ['b', 'c'];

      const result = CodeContract.partialCopy(start, properties);

      expect(result).toEqual({
        b: 'hello',
        c: 'world',
      });
      done();
    });

    it('partialCopy() - returns empty object when no properties are passed in', done => {
      const start = {
        x: 10,
        y: 20,
      };
      const properties = [];

      const result = CodeContract.partialCopy(start, properties);
      expect(result).toEqual({});
      done();
    });

    it('partialCopy() - assigns properties on passed in object (third parameter)', done => {
      const start = {
        x: 10,
        y: 20,
      };
      const properties = ['x'];
      const target = {
        a: 'hello world',
      };

      const result = CodeContract.partialCopy(start, properties, target);
      expect(result).toEqual({
        a: 'hello world',
        x: 10,
      });
      done();
    });

    it('partialCopy() - second parameter accepts property filter function', done => {
      const start = {
        a: 1,
        b: 2,
        c: 3,
      };
      const propertiesfilter = (prop: any) => prop === 'b';

      const result = CodeContract.partialCopy(start, propertiesfilter);
      expect(result).toEqual({
        b: 2,
      });
      done();
    });
  });

  describe('makeJsonObject', () => {
    it('makeJsonObject() - builds object from an array of property values', done => {
      const propChanges: PropertyChange[] = [
        {
          name: 'gny',
          current: 1 * 1e8,
          original: 0,
        },
        {
          name: 'username',
          current: 'liangpeili',
          original: '',
        },
      ];

      const getKey = (one: PropertyChange) => one.name;
      const getValue = (one: PropertyChange) => one.current;
      const result = CodeContract.makeJsonObject(propChanges, getKey, getValue);

      expect(result).toEqual({
        gny: 1 * 1e8,
        username: 'liangpeili',
      });
      done();
    });
  });
});
