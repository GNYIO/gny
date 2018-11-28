import BlockReward from '../../../src/utils/block-reward';
const BigNumber = require('bignumber.js');
import { REWARDS, TOTAL_AMOUNT} from '../../../src/utils/constants';

describe('BlockReward', () => {
  let blockReward;

  beforeEach(done => {
    blockReward = new BlockReward();
    done();
  })

  describe('calculateMilestone', () => {
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

		it('when height == (milestoneThree * 2) should return 4', () => {
			return expect(
				blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(2))
			).toBe(3);
		});

		it('when height == (milestoneThree * 10) should return 4', () => {
			return expect(
				blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(10))
			).toBe(3);
		});

		it('when height == (milestoneThree * 100) should return 4', () => {
			return expect(
				blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(100))
			).toBe(3);
		});

		it('when height == (milestoneThree * 1000) should return 4', () => {
			return expect(
				blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(1000))
			).toBe(3);
		});

		it('when height == (milestoneThree * 10000) should return 4', () => {
			return expect(
				blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(10000))
			).toBe(3);
    });
    
    it('when height == (milestoneThree * 100000) should return 4', () => {
			return expect(
				blockReward.calculateMilestone(new BigNumber(9002160).multipliedBy(100000))
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
			return expect(blockReward.calculateReward(2161)).toBe(200000000);
    });
    

		it('when height == (milestoneOne - 1) should return 200000000', () => {
			return expect(blockReward.calculateReward(3002159)).toBe(200000000);
		});

		it('when height == (milestoneOne) should return 150000000', () => {
			return expect(blockReward.calculateReward(3002160)).toBe(150000000)
		});

		it('when height == (milestoneOne + 1) should return 150000000', () => {
			return expect(blockReward.calculateReward(3002161)).toBe(150000000)
		});

		it('when height == (milestoneTwo - 1) should return 150000000', () => {
			return expect(blockReward.calculateReward(6002159)).toBe(150000000)
		});

		it('when height == (milestoneTwo) should return 100000000', () => {
			return expect(blockReward.calculateReward(6002160)).toBe(100000000)
		});

		it('when height == (milestoneTwo + 1) should return 100000000', () => {
			return expect(blockReward.calculateReward(6002161)).toBe(100000000)
		});

		it('when height == (milestoneThree - 1) should return 100000000', () => {
			return expect(blockReward.calculateReward(9002159)).toBe(100000000)
		});

		it('when height == (milestoneThree) should return 50000000', () => {
			return expect(blockReward.calculateReward(9002160)).toBe(50000000)
		});

		it('when height == (milestoneThree + 1) should return 50000000', () => {
			return expect(blockReward.calculateReward(9002161)).toBe(50000000)
    });
    
    it('when height == (milestoneFour * 2) should return 50000000', () => {
			return expect(blockReward.calculateReward(new BigNumber(9002160).multipliedBy(2))).toBe(50000000)
		});

		it('when height == (milestoneFour * 10) should return 100000000', () => {
			return expect(blockReward.calculateReward(new BigNumber(9002160).multipliedBy(10))).toBe(50000000)
		});

		it('when height == (milestoneFour * 100) should return 100000000', () => {
			return expect(blockReward.calculateReward(new BigNumber(9002160).multipliedBy(100))).toBe(50000000)
		});

		it('when height == (milestoneFour * 1000) should return 100000000', () => {
			return expect(blockReward.calculateReward(new BigNumber(9002160).multipliedBy(1000))).toBe(50000000)
		});

		it('when height == (milestoneFour * 10000) should return 100000000', () => {
			return expect(blockReward.calculateReward(new BigNumber(9002160).multipliedBy(10000))).toBe(50000000)
		});

		it('when height == (milestoneFour * 100000) should return 100000000', () => {
			return expect(blockReward.calculateReward(new BigNumber(9002160).multipliedBy(100000))).toBe(50000000)
		});
  });
})










