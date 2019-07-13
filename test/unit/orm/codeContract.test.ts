import * as CodeContract from '../../../packages/database-postgres/src/codeContract';
import { isParenthesizedExpression } from '@babel/types';

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
});
