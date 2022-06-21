import { LoaderHelper } from '../../../packages/main/src/core/LoaderHelper';
import { IBlock } from '../../../packages/interfaces';

describe('LoaderHelper', () => {
  describe('getIdSequence2', () => {
    it('getIdSequence2() - returns the 4 last blockIds in descending order (happy path)', async done => {
      const currentLastBlockHeight = String(59);

      const blocksAscending = [
        {
          height: String(55),
          id: 'fivefive',
        },
        {
          height: String(56),
          id: 'fivesix',
        },
        {
          height: String(57),
          id: 'fiveseven',
        },
        {
          height: String(58),
          id: 'fiveeight',
        },
        {
          height: String(59),
          id: 'fivenine',
        },
      ] as IBlock[];
      const getBlocksByHeightRange = jest
        .fn()
        .mockImplementation(() => Promise.resolve(blocksAscending));

      // act
      const result = await LoaderHelper.getIdSequence2(
        currentLastBlockHeight,
        getBlocksByHeightRange
      );

      expect(result).toHaveProperty('min', String(55));
      expect(result).toHaveProperty('max', String(59));
      expect(result).toHaveProperty('ids', [
        'fivenine',
        'fiveeight',
        'fiveseven',
        'fivesix',
        'fivefive',
      ]);

      done();
    });

    it('getIdSequence2() - throws Error with "getIdSequence2 failed" if something goes wrong', async () => {
      // preparation
      const currentLastBlockHeight = String(30);

      const getBlocksByHeightRangeMock = jest
        .fn()
        .mockImplementation(() => Promise.reject('something wrong happend'));

      // act
      const resultPromise = LoaderHelper.getIdSequence2(
        currentLastBlockHeight,
        getBlocksByHeightRangeMock
      );

      return expect(resultPromise).rejects.toHaveProperty(
        'message',
        'getIdSequence2 failed'
      );
    });
  });
});
