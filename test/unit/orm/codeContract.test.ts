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

  describe('notNullOrWhitespace', () => {
    it('notNullOrWhitespace() - returns true for ordinary string', done => {
      const result = CodeContract.notNullOrWhitespace('hello');
      expect(result).toEqual({
        result: true,
        message: undefined,
      });
      done();
    });

    it('notNullOrWhitespace() - returns false for empty string', done => {
      const result = CodeContract.notNullOrWhitespace('');
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined or whitespace',
      });
      done();
    });

    it('notNullOrWhitespace() - returns false for longer empty string', done => {
      const result = CodeContract.notNullOrWhitespace('      ');
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined or whitespace',
      });
      done();
    });

    it('notNullOrWhitespace() - returns false for undefined', done => {
      const result = CodeContract.notNullOrWhitespace(undefined);
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined or whitespace',
      });
      done();
    });

    it('notNullOrWhitespace() - returns false for null', done => {
      const result = CodeContract.notNullOrWhitespace(null);
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined or whitespace',
      });
      done();
    });
  });

  describe('notNullOrEmpty', () => {
    it('notNullOrEmpty() - returns false for null', done => {
      const result = CodeContract.notNullOrEmpty(null);
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined or empty',
      });
      done();
    });

    it('notNullOrEmpty() - returns false for undefined', done => {
      const result = CodeContract.notNullOrEmpty(undefined);
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined or empty',
      });
      done();
    });

    it('notNullOrEmpty() - returns false for empty string', done => {
      const result = CodeContract.notNullOrEmpty('');
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined or empty',
      });
      done();
    });

    it('notNullOrEmpty() - returns true for long empty string', done => {
      const result = CodeContract.notNullOrEmpty('    ');
      expect(result).toEqual({
        result: true,
        message: undefined,
      });
      done();
    });
  });

  describe('notNull', () => {
    it('notNull() - returns false for null', done => {
      const result = CodeContract.notNull(null);
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined',
      });
      done();
    });

    it('notNull() - returns false for undefined', done => {
      const result = CodeContract.notNull(undefined);
      expect(result).toEqual({
        result: false,
        message: 'cannot be null or undefined',
      });
      done();
    });

    it('notNull() - returns true for empty string', done => {
      const result = CodeContract.notNull('');
      expect(result).toEqual({
        result: true,
        message: undefined,
      });
      done();
    });

    it('notNull() - returns true for ordinary string', done => {
      const result = CodeContract.notNull('hello');
      expect(result).toEqual({
        result: true,
        message: undefined,
      });
      done();
    });
  });

  describe('argument', () => {
    it('argument() - call function - no error (2 parameters)', done => {
      const someVar = 'some variable';

      CodeContract.argument('name', () => CodeContract.notNull(someVar));
      done();
    });

    it('argument() - call function - throws error (2 parameters)', done => {
      const someVar = undefined;

      expect(() =>
        CodeContract.argument('name', () => CodeContract.notNull(someVar))
      ).toThrowError("argument 'name' cannot be null or undefined");
      done();
    });

    it('argument() - call function - no error (3 parameters)', done => {
      const someVar = 'hello';

      CodeContract.argument(
        'someVar',
        someVar !== undefined,
        'custom error message'
      );
      done();
    });

    it('argument() - call function - throws error (3 parameters)', done => {
      const someVar = undefined;

      expect(() =>
        CodeContract.argument(
          'someVar',
          someVar !== undefined,
          'should throw custom error message'
        )
      ).toThrowError('should throw custom error message');
      done();
    });
  });

  describe('verify', () => {
    it('verify() - throws if first argument is false', done => {
      const someVariable = undefined;

      expect(() =>
        CodeContract.verify(
          someVariable !== undefined,
          () => 'exact error message'
        )
      ).toThrow('exact error message');

      done();
    });

    it('verify() - throws if first argument is a boolean function that returns false', done => {
      const booleanExpression = [1, 2, 3].length === 0;
      const booleanFunc = () => booleanExpression;

      expect(() => CodeContract.verify(booleanFunc, 'weird error')).toThrow(
        'weird error'
      );
      done();
    });

    it('verify() - does not throw if passed a true expression', done => {
      const booleanExpression = true;

      const result = CodeContract.verify(
        booleanExpression,
        'when things go wrong'
      );
      expect(result).toBeUndefined();
      done();
    });
  });
});
