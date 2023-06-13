import { getDate } from '@gny/utils';

describe('getDate()', () => {
  describe('currentHeight', () => {
    it('getDate() - throws if currentHeight is not an string', () => {
      expect.assertions(1);

      const currentHeight: string = (1 as any) as string;
      const currentDate = '20230613';
      const targetHeight = '20000';

      expect(() => getDate(currentHeight, currentDate, targetHeight)).toThrow(
        'currentHeight is not an string'
      );
    });

    it('getDate() - throws if currentHeight is not an integer', () => {
      expect.assertions(1);

      const currentHeight = '1.1';
      const currentDate = '20230613';
      const targetHeight = '20000';

      expect(() => getDate(currentHeight, currentDate, targetHeight)).toThrow(
        'currentHeight is not an int'
      );
    });
  });

  describe('currentDate', () => {
    it('getDate() - throws if currentDate not in correct YYYYMMDD format', () => {
      expect.assertions(1);

      const currentHeight = '1';
      const currentDate = '2023'; // the rest is missing
      const targetHeight = '20000';

      expect(() => getDate(currentHeight, currentDate, targetHeight)).toThrow(
        'currentDate not in correct format'
      );
    });
  });

  describe('targetHeight', () => {
    it('getDate() - throws if targetHeight is not an string', () => {
      expect.assertions(1);

      const currentHeight = '1';
      const currentDate = '20230613';
      const targetHeight = (20000 as any) as string;

      expect(() => getDate(currentHeight, currentDate, targetHeight)).toThrow(
        'targetHeight is not an string'
      );
    });

    it('getDate() - throws if targetHeight is not an int', () => {
      expect.assertions(1);

      const currentHeight = '1';
      const currentDate = '20230613';
      const targetHeight = '20000.2';

      expect(() => getDate(currentHeight, currentDate, targetHeight)).toThrow(
        'targetHeight is not an int'
      );
    });
  });

  describe('currentHeight vs targetHeight', () => {
    it('getDate() - throws if targetHeight same as currentHeight', () => {
      expect.assertions(1);

      const currentHeight = '1';
      const currentDate = '20230613';
      const targetHeight = '1';

      expect(() => getDate(currentHeight, currentDate, targetHeight)).toThrow(
        'targetHeight needs to be greater than currentHeight'
      );
    });

    it('getDate() - throws if targetHeight smaller than currentHeight', () => {
      expect.assertions(1);

      const currentHeight = '10';
      const currentDate = '20230613';
      const targetHeight = '9';

      expect(() => getDate(currentHeight, currentDate, targetHeight)).toThrow(
        'targetHeight needs to be greater than currentHeight'
      );
    });
  });

  it('getDate() - returns same day if targetHeight not bigger than 8640 blocks', () => {
    expect.assertions(1);

    const currentHeight = '1';
    const currentDate = '20230613';
    const targetHeight = '8639';

    const result = getDate(currentHeight, currentDate, targetHeight);
    expect(result).toEqual('20230613');
  });

  it('getDate() - returns next day if targetHeight is bigger than 8640 blocks', () => {
    expect.assertions(1);

    const currentHeight = '1';
    const currentDate = '20230613';
    const targetHeight = '8641';

    const result = getDate(currentHeight, currentDate, targetHeight);
    expect(result).toEqual('20230614');
  });

  it('getDate() - returns day after tomorrow if targetHeight is plus 17280', () => {
    expect.assertions(1);

    const currentHeight = '1';
    const currentDate = '20230613';
    const targetHeight = '17281';

    const result = getDate(currentHeight, currentDate, targetHeight);
    expect(result).toEqual('20230615');
  });
});
