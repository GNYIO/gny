import { BlockReward } from '@gny/utils';
import { BigNumber } from 'bignumber.js';

function range(start: number, end: number) {
  const result: number[] = [];
  for (let i = start; i <= end; ++i) {
    result.push(i);
  }
  return result;
}

describe('BlockReward', () => {
  let blockReward: BlockReward;

  beforeEach(done => {
    blockReward = new BlockReward();
    done();
  });

  describe('calculateMilestone', () => {
    it('throws when passed in NaN', () => {
      return expect(() => blockReward.calculateMilestone(NaN)).toThrowError(
        'Invalid block height'
      );
    });

    it('throws when passed in Infinity', () => {
      return expect(() =>
        blockReward.calculateMilestone(Infinity)
      ).toThrowError('Invalid block height');
    });

    it('throws when passed in decimal', () => {
      return expect(() => blockReward.calculateMilestone(2.2)).toThrowError(
        'Invalid block height'
      );
    });

    it('milestone 0 has 4036800 heights', () => {
      const count = range(0, 4036799).length;
      expect(count).toEqual(4036800);

      const milestoneForHeight_0 = blockReward.calculateMilestone(0);
      expect(milestoneForHeight_0).toEqual(0);

      const milestoneForHeight_4036799 = blockReward.calculateMilestone(
        4036799
      );
      return expect(milestoneForHeight_4036799).toEqual(0);
    });

    it('milestone 1 has 3000000 heights', () => {
      const count = range(4036800, 7036799).length;
      expect(count).toEqual(3000000);

      const milestoneForHeight_4036800 = blockReward.calculateMilestone(
        4036800
      );
      expect(milestoneForHeight_4036800).toEqual(1);

      const milestoneForHeight_7036799 = blockReward.calculateMilestone(
        7036799
      );
      return expect(milestoneForHeight_7036799).toEqual(1);
    });

    it('milestone 2 has 3000000 heights', () => {
      const count = range(7036800, 10036799).length;
      expect(count).toEqual(3000000);

      const milestoneForHeight_7036800 = blockReward.calculateMilestone(
        7036800
      );
      expect(milestoneForHeight_7036800).toEqual(2);

      const milestoneForHeight_10036799 = blockReward.calculateMilestone(
        10036799
      );
      return expect(milestoneForHeight_10036799).toEqual(2);
    });

    it('the sum for all heights >= 0 && <= 4036799 is (0 * 4036799)', () => {
      let sum = 0;
      range(0, 4036799).map(one => {
        sum += blockReward.calculateMilestone(one);
      });
      return expect(sum).toEqual(0);
    });

    it('the sum of all heights >= 4036800 && <= 7036799 is (1 x 3000000)', () => {
      let sum = 0;
      range(4036800, 7036799).map(one => {
        sum += blockReward.calculateMilestone(one);
      });
      return expect(sum).toEqual(3000000);
    });

    it('the sum of all heights >= 7036800 && <= 10036799 is (2 x 3000000)', () => {
      let sum = 0;
      range(7036800, 10036799).map(one => {
        sum += blockReward.calculateMilestone(one);
      });
      return expect(sum).toEqual(2 * 3000000);
    });

    it('when height == 0 should return 0', () => {
      return expect(blockReward.calculateMilestone(0)).toBe(0);
    });

    it('when height == 1 should return 0', () => {
      return expect(blockReward.calculateMilestone(1)).toBe(0);
    });

    it('when height == (offset - 1) should return 0', () => {
      return expect(blockReward.calculateMilestone(1036799)).toBe(0);
    });

    it('when height == (offset) should return 0', () => {
      return expect(blockReward.calculateMilestone(1036800)).toBe(0);
    });

    it('when height == (offset + 1) should return 0', () => {
      return expect(blockReward.calculateMilestone(1036801)).toBe(0);
    });

    it('when height == (offset + 2) should return 0', () => {
      return expect(blockReward.calculateMilestone(1036802)).toBe(0);
    });

    it('when height == (distance) should return 0', () => {
      return expect(blockReward.calculateMilestone(3000000)).toBe(0);
    });

    it('when height == (distance + 1) should return 0', () => {
      return expect(blockReward.calculateMilestone(3000001)).toBe(0);
    });

    it('when height == (distance + 2) should return 0', () => {
      return expect(blockReward.calculateMilestone(3000002)).toBe(0);
    });

    it('when height == (milestoneOne - 1) should return 0', () => {
      return expect(blockReward.calculateMilestone(4036799)).toBe(0);
    });

    it('when height == (milestoneOne) should return 1', () => {
      return expect(blockReward.calculateMilestone(4036800)).toBe(1);
    });

    it('when height == (milestoneOne + 1) should return 1', () => {
      return expect(blockReward.calculateMilestone(4036801)).toBe(1);
    });

    it('when height == (milestoneTwo - 1) should return 1', () => {
      return expect(blockReward.calculateMilestone(7036799)).toBe(1);
    });

    it('when height == (milestoneTwo) should return 2', () => {
      return expect(blockReward.calculateMilestone(7036800)).toBe(2);
    });

    it('when height == (milestoneTwo + 1) should return 2', () => {
      return expect(blockReward.calculateMilestone(7036801)).toBe(2);
    });

    it('when height == (milestoneThree - 1) should return 2', () => {
      return expect(blockReward.calculateMilestone(10036799)).toBe(2);
    });

    it('when height == (milestoneThree) should return 3', () => {
      return expect(blockReward.calculateMilestone(10036800)).toBe(3);
    });

    it('when height == (milestoneThree + 1) should return 3', () => {
      return expect(blockReward.calculateMilestone(10036801)).toBe(3);
    });

    it('when height == (milestoneThree * 2) should return 3', () => {
      return expect(
        blockReward.calculateMilestone(new BigNumber(10036800).multipliedBy(2))
      ).toBe(3);
    });

    it('when height == (milestoneThree * 10) should return 3', () => {
      return expect(
        blockReward.calculateMilestone(new BigNumber(10036800).multipliedBy(10))
      ).toBe(3);
    });

    it('when height == (milestoneThree * 100) should return 3', () => {
      return expect(
        blockReward.calculateMilestone(
          new BigNumber(10036800).multipliedBy(100)
        )
      ).toBe(3);
    });

    it('when height == (milestoneThree * 1000) should return 3', () => {
      return expect(
        blockReward.calculateMilestone(
          new BigNumber(10036800).multipliedBy(1000)
        )
      ).toBe(3);
    });

    it('when height == (milestoneThree * 10000) should return 4', () => {
      return expect(
        blockReward.calculateMilestone(
          new BigNumber(10036800).multipliedBy(10000)
        )
      ).toBe(3);
    });

    it('when height == (milestoneThree * 100000) should return 4', () => {
      return expect(
        blockReward.calculateMilestone(
          new BigNumber(10036800).multipliedBy(100000)
        )
      ).toBe(3);
    });
  });

  describe('calculateReward', () => {
    it('throws when passed in NaN', () => {
      return expect(() => blockReward.calculateReward(NaN)).toThrowError(
        'Invalid block height'
      );
    });

    it('throws when passed in Infinity', () => {
      return expect(() => blockReward.calculateReward(Infinity)).toThrowError(
        'Invalid block height'
      );
    });

    it('throws when passed in decimal', () => {
      return expect(() => blockReward.calculateReward(2.2)).toThrowError(
        'Invalid block height'
      );
    });

    it('when height == 0 should return 0', () => {
      return expect(blockReward.calculateReward(0)).toBe(0);
    });

    it('when height == 1 should return 0', () => {
      return expect(blockReward.calculateReward(1)).toBe(0);
    });

    it('when height == (offset - 1) should return 0', () => {
      return expect(blockReward.calculateReward(1036799)).toBe(0);
    });

    it('when height == (offset) should return 200000000', () => {
      return expect(blockReward.calculateReward(1036800)).toBe(200000000);
    });

    it('when height == (offset + 1) should return 200000000', () => {
      return expect(blockReward.calculateReward(1036801)).toBe(200000000);
    });

    it('when height == (offset + 2) should return 200000000', () => {
      return expect(blockReward.calculateReward(1036802)).toBe(200000000);
    });

    it('when height == (milestoneOne - 1) should return 200000000', () => {
      return expect(blockReward.calculateReward(4036799)).toBe(200000000);
    });

    it('when height == (milestoneOne) should return 150000000', () => {
      return expect(blockReward.calculateReward(4036800)).toBe(150000000);
    });

    it('when height == (milestoneOne + 1) should return 150000000', () => {
      return expect(blockReward.calculateReward(4036801)).toBe(150000000);
    });

    it('when height == (milestoneTwo - 1) should return 150000000', () => {
      return expect(blockReward.calculateReward(7036799)).toBe(150000000);
    });

    it('when height == (milestoneTwo) should return 100000000', () => {
      return expect(blockReward.calculateReward(7036800)).toBe(100000000);
    });

    it('when height == (milestoneTwo + 1) should return 100000000', () => {
      return expect(blockReward.calculateReward(7036801)).toBe(100000000);
    });

    it('when height == (milestoneThree - 1) should return 100000000', () => {
      return expect(blockReward.calculateReward(10036799)).toBe(100000000);
    });

    it('when height == (milestoneThree) should return 50000000', () => {
      return expect(blockReward.calculateReward(10036800)).toBe(50000000);
    });

    it('when height == (milestoneThree + 1) should return 50000000', () => {
      return expect(blockReward.calculateReward(10036801)).toBe(50000000);
    });

    it('when height == (milestoneThree * 2) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(10036800).multipliedBy(2))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 10) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(10036800).multipliedBy(10))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 100) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(10036800).multipliedBy(100))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 1000) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(10036800).multipliedBy(1000))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 10000) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(10036800).multipliedBy(10000))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 100000) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(
          new BigNumber(10036800).multipliedBy(100000)
        )
      ).toBe(50000000);
    });
  });

  describe('calculateSupply', () => {
    it('throws when passed in NaN', () => {
      return expect(() => blockReward.calculateSupply(NaN)).toThrowError();
    });

    it('throws when passed in Infinity', () => {
      return expect(() => blockReward.calculateSupply(Infinity)).toThrowError();
    });

    it('throws when passed in decimal', () => {
      return expect(() => blockReward.calculateSupply(2.2)).toThrowError(
        'Invalid block height'
      );
    });

    it('returns BigNumber instance', () => {
      return expect(
        BigNumber.isBigNumber(blockReward.calculateSupply(0))
      ).toEqual(true);
    });

    it('when height 0 == supply should be 40000000000000000', () => {
      return expect(blockReward.calculateSupply(0)).toEqual(
        new BigNumber('40000000000000000')
      );
    });

    it('when height == (offset - 1) supply should be "40000000000000000"', () => {
      return expect(blockReward.calculateSupply(1036799)).toEqual(
        new BigNumber('40000000000000000')
      );
    });

    it('when height == (offset) supply should be "40000000200000000"', () => {
      return expect(blockReward.calculateSupply(1036800)).toEqual(
        new BigNumber('40000000000000000').plus('200000000')
      );
    });

    it('when height == (offset + 1) supply should be "40000000400000000"', () => {
      return expect(blockReward.calculateSupply(1036801)).toEqual(
        new BigNumber('40000000000000000').plus('400000000')
      );
    });

    it('when height == (offset + 2) supply should be "40000000600000000"', () => {
      return expect(blockReward.calculateSupply(1036802)).toEqual(
        new BigNumber('40000000000000000').plus('600000000')
      );
    });

    it('when height == (distance) supply should be "40392640200000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 3000000).length).times(
        200000000
      );

      const expected = initialSupply.plus(milestoneZero);
      expect(expected.toFixed()).toEqual('40392640200000000');
      return expect(blockReward.calculateSupply(3000000)).toEqual(expected);
    });

    it('when height == (milestoneOne - 1) supply should be "40600000000000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );

      const expected = initialSupply.plus(milestoneZero);
      return expect(blockReward.calculateSupply(4036799)).toEqual(expected);
    });

    it('when height == (milestoneOne) supply should be "40600000150000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 4036800).length).times(
        150000000
      );

      const expected = initialSupply.plus(milestoneZero).plus(milestoneOne);
      return expect(blockReward.calculateSupply(4036800)).toEqual(expected);
    });

    it('when height == (milestoneOne + 1) supply should be "40600000300000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 4036801).length).times(
        150000000
      );

      const expected = initialSupply.plus(milestoneZero).plus(milestoneOne);
      return expect(blockReward.calculateSupply(4036801)).toEqual(expected);
    });

    it('when height == (milestoneTwo - 1) supply should be "41050000000000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 7036799).length).times(
        150000000
      );

      const expected = initialSupply.plus(milestoneZero).plus(milestoneOne);
      return expect(blockReward.calculateSupply(7036799)).toEqual(expected);
    });

    it('when height == (milestoneTwo) supply should be "41050000100000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 7036799).length).times(
        150000000
      );
      const milestoneTwo = new BigNumber(range(7036800, 7036800).length).times(
        100000000
      );

      const expected = initialSupply
        .plus(milestoneZero)
        .plus(milestoneOne)
        .plus(milestoneTwo);
      return expect(blockReward.calculateSupply(7036800)).toEqual(expected);
    });

    it('when height == (milestoneTwo + 1) supply should be "41050000200000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 7036799).length).times(
        150000000
      );
      const milestoneTwo = new BigNumber(range(7036800, 7036801).length).times(
        100000000
      );

      const expected = initialSupply
        .plus(milestoneZero)
        .plus(milestoneOne)
        .plus(milestoneTwo);
      return expect(blockReward.calculateSupply(7036801)).toEqual(expected);
    });

    it('when height == (milestoneThree - 1) supply should be "41350000000000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 7036799).length).times(
        150000000
      );
      const milestoneTwo = new BigNumber(range(7036800, 10036799).length).times(
        100000000
      );

      const expected = initialSupply
        .plus(milestoneZero)
        .plus(milestoneOne)
        .plus(milestoneTwo);
      return expect(blockReward.calculateSupply(10036799)).toEqual(expected);
    });

    it('when height == (milestoneThree) supply should be "41350000050000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 7036799).length).times(
        150000000
      );
      const milestoneTwo = new BigNumber(range(7036800, 10036799).length).times(
        100000000
      );
      const milestoneThree = new BigNumber(
        range(10036800, 10036800).length
      ).times(50000000);

      const expected = initialSupply
        .plus(milestoneZero)
        .plus(milestoneOne)
        .plus(milestoneTwo)
        .plus(milestoneThree);
      return expect(blockReward.calculateSupply(10036800)).toEqual(expected);
    });

    it('when height == (milestoneThree + 1) supply should return "41350000100000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 7036799).length).times(
        150000000
      );
      const milestoneTwo = new BigNumber(range(7036800, 10036799).length).times(
        100000000
      );
      const milestoneThree = new BigNumber(
        range(10036800, 10036801).length
      ).times(50000000);

      const expected = initialSupply
        .plus(milestoneZero)
        .plus(milestoneOne)
        .plus(milestoneTwo)
        .plus(milestoneThree);
      return expect(blockReward.calculateSupply(10036801)).toEqual(expected);
    });

    it('when height == (milestoneThree * 2) supply should be "41800108050000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(1036800, 4036799).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(4036800, 7036799).length).times(
        150000000
      );
      const milestoneTwo = new BigNumber(range(7036800, 10036799).length).times(
        100000000
      );
      const milestoneThree = new BigNumber(
        range(10036800, 10036800 * 2).length
      ).times(50000000);

      const expected = initialSupply
        .plus(milestoneZero)
        .plus(milestoneOne)
        .plus(milestoneTwo)
        .plus(milestoneThree);
      return expect(blockReward.calculateSupply(10036800 * 2)).toEqual(
        expected
      );
    });

    it('when height 2 000 000 == supply should be "40192640200000000"', () => {
      return expect(blockReward.calculateSupply(2000000)).toEqual(
        new BigNumber('40192640200000000')
      );
    });
  });
});
