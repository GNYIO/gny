import BlockReward from '../../../src/utils/block-reward';
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
    it('milestone 0 has 3002160 heights', () => {
      const count = range(0, 3002159).length;
      expect(count).toEqual(3002160);

      const milestoneForHeight_0 = blockReward.calculateMilestone(0);
      expect(milestoneForHeight_0).toEqual(0);

      const milestoneForHeight_3002159 = blockReward.calculateMilestone(
        3002159
      );
      return expect(milestoneForHeight_3002159).toEqual(0);
    });

    it('milestone 1 has 3000000 heights', () => {
      const count = range(3002160, 6002159).length;
      expect(count).toEqual(3000000);

      const milestoneForHeight_3002160 = blockReward.calculateMilestone(
        3002160
      );
      expect(milestoneForHeight_3002160).toEqual(1);

      const milestoneForHeight_6002159 = blockReward.calculateMilestone(
        6002159
      );
      return expect(milestoneForHeight_6002159).toEqual(1);
    });

    it('milestone 2 has 3000000 heights', () => {
      const count = range(6002160, 9002159).length;
      expect(count).toEqual(3000000);

      const milestoneForHeight_6002160 = blockReward.calculateMilestone(
        6002160
      );
      expect(milestoneForHeight_6002160).toEqual(2);

      const milestoneForHeight_9002159 = blockReward.calculateMilestone(
        9002159
      );
      return expect(milestoneForHeight_9002159).toEqual(2);
    });

    it('the sum for all heights >= 0 && <= 3002159 is (0 * 3002159)', () => {
      let sum = 0;
      range(0, 3002159).map(one => {
        sum += blockReward.calculateMilestone(one);
      });
      return expect(sum).toEqual(0);
    });

    it('the sum of all heights >= 3002160 && <= 6002159 is (1 x 3000000)', () => {
      let sum = 0;
      range(3002160, 6002159).map(one => {
        sum += blockReward.calculateMilestone(one);
      });
      return expect(sum).toEqual(3000000);
    });

    it('the sum of all heights >= 6002160 && <= 9002159 is (2 x 3000000)', () => {
      let sum = 0;
      range(6002160, 9002159).map(one => {
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
      return expect(blockReward.calculateMilestone(2159)).toBe(0);
    });

    it('when height == (offset) should return 0', () => {
      return expect(blockReward.calculateMilestone(2160)).toBe(0);
    });

    it('when height == (offset + 1) should return 0', () => {
      return expect(blockReward.calculateMilestone(2161)).toBe(0);
    });

    it('when height == (offset + 2) should return 0', () => {
      return expect(blockReward.calculateMilestone(2162)).toBe(0);
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
      return expect(blockReward.calculateMilestone(3002159)).toBe(0);
    });

    it('when height == (milestoneOne) should return 1', () => {
      return expect(blockReward.calculateMilestone(3002160)).toBe(1);
    });

    it('when height == (milestoneOne + 1) should return 1', () => {
      return expect(blockReward.calculateMilestone(3002161)).toBe(1);
    });

    it('when height == (milestoneTwo - 1) should return 1', () => {
      return expect(blockReward.calculateMilestone(6002159)).toBe(1);
    });

    it('when height == (milestoneTwo) should return 2', () => {
      return expect(blockReward.calculateMilestone(6002160)).toBe(2);
    });

    it('when height == (milestoneTwo + 1) should return 2', () => {
      return expect(blockReward.calculateMilestone(6002161)).toBe(2);
    });

    it('when height == (milestoneThree - 1) should return 2', () => {
      return expect(blockReward.calculateMilestone(9002159)).toBe(2);
    });

    it('when height == (milestoneThree) should return 3', () => {
      return expect(blockReward.calculateMilestone(9002160)).toBe(3);
    });

    it('when height == (milestoneThree + 1) should return 3', () => {
      return expect(blockReward.calculateMilestone(9002161)).toBe(3);
    });

    it('when height == (milestoneThree * 2) should return 3', () => {
      return expect(
        blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(2))
      ).toBe(3);
    });

    it('when height == (milestoneThree * 10) should return 3', () => {
      return expect(
        blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(10))
      ).toBe(3);
    });

    it('when height == (milestoneThree * 100) should return 3', () => {
      return expect(
        blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(100))
      ).toBe(3);
    });

    it('when height == (milestoneThree * 1000) should return 3', () => {
      return expect(
        blockReward.calculateMilestone(
          new BigNumber(9002160).multipliedBy(1000)
        )
      ).toBe(3);
    });

    it('when height == (milestoneThree * 10000) should return 4', () => {
      return expect(
        blockReward.calculateMilestone(
          new BigNumber(9002160).multipliedBy(10000)
        )
      ).toBe(3);
    });

    it('when height == (milestoneThree * 100000) should return 4', () => {
      return expect(
        blockReward.calculateMilestone(
          new BigNumber(9002160).multipliedBy(100000)
        )
      ).toBe(3);
    });
  });

  describe('calculateReward', () => {
    it('when height == 0 should return 0', () => {
      return expect(blockReward.calculateReward(0)).toBe(0);
    });

    it('when height == 1 should return 0', () => {
      return expect(blockReward.calculateReward(1)).toBe(0);
    });

    it('when height == (offset - 1) should return 0', () => {
      return expect(blockReward.calculateReward(2159)).toBe(0);
    });

    it('when height == (offset) should return 200000000', () => {
      return expect(blockReward.calculateReward(2160)).toBe(200000000);
    });

    it('when height == (offset + 1) should return 200000000', () => {
      return expect(blockReward.calculateReward(2161)).toBe(200000000);
    });

    it('when height == (offset + 2) should return 200000000', () => {
      return expect(blockReward.calculateReward(2162)).toBe(200000000);
    });

    it('when height == (milestoneOne - 1) should return 200000000', () => {
      return expect(blockReward.calculateReward(3002159)).toBe(200000000);
    });

    it('when height == (milestoneOne) should return 150000000', () => {
      return expect(blockReward.calculateReward(3002160)).toBe(150000000);
    });

    it('when height == (milestoneOne + 1) should return 150000000', () => {
      return expect(blockReward.calculateReward(3002161)).toBe(150000000);
    });

    it('when height == (milestoneTwo - 1) should return 150000000', () => {
      return expect(blockReward.calculateReward(6002159)).toBe(150000000);
    });

    it('when height == (milestoneTwo) should return 100000000', () => {
      return expect(blockReward.calculateReward(6002160)).toBe(100000000);
    });

    it('when height == (milestoneTwo + 1) should return 100000000', () => {
      return expect(blockReward.calculateReward(6002161)).toBe(100000000);
    });

    it('when height == (milestoneThree - 1) should return 100000000', () => {
      return expect(blockReward.calculateReward(9002159)).toBe(100000000);
    });

    it('when height == (milestoneThree) should return 50000000', () => {
      return expect(blockReward.calculateReward(9002160)).toBe(50000000);
    });

    it('when height == (milestoneThree + 1) should return 50000000', () => {
      return expect(blockReward.calculateReward(9002161)).toBe(50000000);
    });

    it('when height == (milestoneThree * 2) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(9002160).multipliedBy(2))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 10) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(9002160).multipliedBy(10))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 100) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(9002160).multipliedBy(100))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 1000) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(9002160).multipliedBy(1000))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 10000) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(9002160).multipliedBy(10000))
      ).toBe(50000000);
    });

    it('when height == (milestoneThree * 100000) should return 50000000', () => {
      return expect(
        blockReward.calculateReward(new BigNumber(9002160).multipliedBy(100000))
      ).toBe(50000000);
    });
  });

  describe('calculateSupply', () => {
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
      return expect(blockReward.calculateSupply(2159)).toEqual(
        new BigNumber('40000000000000000')
      );
    });

    it('when height == (offset) supply should be "40000000200000000"', () => {
      return expect(blockReward.calculateSupply(2160)).toEqual(
        new BigNumber('40000000000000000').plus('200000000')
      );
    });

    it('when height == (offset + 1) supply should be "40000000400000000"', () => {
      return expect(blockReward.calculateSupply(2161)).toEqual(
        new BigNumber('40000000000000000').plus('400000000')
      );
    });

    it('when height == (offset + 2) supply should be "40000000600000000"', () => {
      return expect(blockReward.calculateSupply(2162)).toEqual(
        new BigNumber('40000000000000000').plus('600000000')
      );
    });

    it('when height == (distance) supply should be "40599568200000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(2160, 3000000).length).times(
        200000000
      );

      const expected = initialSupply.plus(milestoneZero);
      return expect(blockReward.calculateSupply(3000000)).toEqual(expected);
    });

    it('when height == (milestoneOne - 1) supply should be "40600000000000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(2160, 3002159).length).times(
        200000000
      );

      const expected = initialSupply.plus(milestoneZero);
      return expect(blockReward.calculateSupply(3002159)).toEqual(expected);
    });

    it('when height == (milestoneOne) supply should be "40600000150000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(2160, 3002159).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(3002160, 3002160).length).times(
        150000000
      );

      const expected = initialSupply.plus(milestoneZero).plus(milestoneOne);
      return expect(blockReward.calculateSupply(3002160)).toEqual(expected);
    });

    it('when height == (milestoneOne + 1) supply should be "40600000300000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(2160, 3002159).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(3002160, 3002161).length).times(
        150000000
      );

      const expected = initialSupply.plus(milestoneZero).plus(milestoneOne);
      return expect(blockReward.calculateSupply(3002161)).toEqual(expected);
    });

    it('when height == (milestoneTwo - 1) supply should be "41050000000000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(2160, 3002159).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(3002160, 6002159).length).times(
        150000000
      );

      const expected = initialSupply.plus(milestoneZero).plus(milestoneOne);
      return expect(blockReward.calculateSupply(6002159)).toEqual(expected);
    });

    it('when height == (milestoneTwo) supply should be "41050000100000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(2160, 3002159).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(3002160, 6002159).length).times(
        150000000
      );
      const milestoneTwo = new BigNumber(range(6002160, 6002160).length).times(
        100000000
      );

      const expected = initialSupply
        .plus(milestoneZero)
        .plus(milestoneOne)
        .plus(milestoneTwo);
      return expect(blockReward.calculateSupply(6002160)).toEqual(expected);
    });

    it('when height == (milestoneTwo + 1) supply should be "41050000200000000"', () => {
      const initialSupply = new BigNumber('40000000000000000');

      const milestoneZero = new BigNumber(range(2160, 3002159).length).times(
        200000000
      );
      const milestoneOne = new BigNumber(range(3002160, 6002159).length).times(
        150000000
      );
      const milestoneTwo = new BigNumber(range(6002160, 6002161).length).times(
        100000000
      );

      const expected = initialSupply
        .plus(milestoneZero)
        .plus(milestoneOne)
        .plus(milestoneTwo);
      return expect(blockReward.calculateSupply(6002161)).toEqual(expected);
    });

    it('when height 100 000 == supply should be "40019568200000000"', () => {
      return expect(blockReward.calculateSupply(100000)).toEqual(
        new BigNumber('40019568200000000')
      );
    });
  });
});
