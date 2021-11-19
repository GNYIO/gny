import { exec } from 'shelljs';
import { OperationCanceledException } from 'typescript';
import { TransactionsHelper } from '../../../packages/main/src/core/TransactionsHelper';

describe('TransactionsHelper', () => {
  describe('pure functions', () => {
    it('count 10, offset 0 and limit 5 - should return [5, 9]', () => {
      const count = 10;
      const offset = 0;
      const limit = 5;

      // <---
      // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      // result: [5, 9]
      const [start, end, difference] = TransactionsHelper.reverseTransactions(
        count,
        offset,
        limit
      );

      expect(start).toEqual(5);
      expect(end).toEqual(9);
      expect(difference).toEqual(5);
    });

    it('count 10, offset 7, limit 5 - should return [0, 2]', () => {
      const count = 10;
      const offset = 7;
      const limit = 5;

      // <---
      // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      // [0, 2]
      const [start, end, difference] = TransactionsHelper.reverseTransactions(
        count,
        offset,
        limit
      );

      expect(start).toEqual(0);
      expect(end).toEqual(2);
      expect(difference).toEqual(3);
    });

    it('count 10, offset 9, limit 1 - should return [0, 0]', () => {
      const count = 10;
      const offset = 9;
      const limit = 1;

      // <---
      // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      // [0, 0]
      const [start, end, difference] = TransactionsHelper.reverseTransactions(
        count,
        offset,
        limit
      );

      expect(start).toEqual(0);
      expect(end).toEqual(0);
      expect(difference).toEqual(1);
    });

    it('count 10, offset 0, limit 1 - should return [9, 9]', () => {
      // start: 201, end: 202, offset: 201, limit: 1

      const count = 10;
      const offset = 0;
      const limit = 1;

      // <---
      // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
      // [9, 9]
      const [start, end, difference] = TransactionsHelper.reverseTransactions(
        count,
        offset,
        limit
      );

      expect(start).toEqual(9);
      expect(end).toEqual(9);
      expect(difference).toEqual(1);
    });

    it('count 203, offset 202, limit 100 - should return [0, 0]', () => {
      // limit: 100, offset: 202, count: 203
      // start: 0, end: 0, offset: 202, limit: 100

      const count = 203;
      const offset = 202;
      const limit = 100;

      const [start, end, difference] = TransactionsHelper.reverseTransactions(
        count,
        offset,
        limit
      );

      expect(start).toEqual(0);
      expect(end).toEqual(0);
      expect(difference).toEqual(1);
    });
  });
});
