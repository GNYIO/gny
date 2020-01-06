import { BigNumber } from 'bignumber.js';
import { REWARDS, INITIAL_AMOUNT } from './constants';
import * as _ from 'lodash';

export class BlockReward {
  public distance: number;
  public rewardOffset: number;

  constructor() {
    this.distance = Math.floor(REWARDS.DISTANCE);
    this.rewardOffset = Math.floor(REWARDS.OFFSET);
  }

  private checkType(height: string | number | BigNumber) {
    const value = new BigNumber(height);
    if (value.isNaN() || !value.isFinite() || !value.isInteger()) {
      throw new Error('Invalid block height');
    } else {
      return value.absoluteValue();
    }
  }

  calculateMilestone(height: number | string | BigNumber) {
    height = this.checkType(height);

    const location = new BigNumber(height)
      .minus(this.rewardOffset)
      .dividedToIntegerBy(this.distance);

    // we know that the REWARD.MILESTONES are never empty, therefore !
    const lastMilestone = _.last(REWARDS.MILESTONES)!;

    if (
      location.isGreaterThan(new BigNumber(REWARDS.MILESTONES.length).minus(1))
    ) {
      return REWARDS.MILESTONES.lastIndexOf(lastMilestone);
    }
    return location.absoluteValue().toNumber();
  }

  calculateReward(height: number | string | BigNumber) {
    height = this.checkType(height);

    if (height.isLessThan(this.rewardOffset)) {
      return 0;
    }
    return REWARDS.MILESTONES[this.calculateMilestone(height)];
  }

  calculateSupply(init: number | string | BigNumber) {
    let height = this.checkType(init);
    let supply = new BigNumber(INITIAL_AMOUNT);

    if (height.isLessThan(this.rewardOffset)) {
      return supply;
    }

    const milestone = this.calculateMilestone(height);
    const rewards: Array<[BigNumber, number]> = [];

    let amount = new BigNumber(0);
    let multiplier: number = 0;
    height = height.minus(this.rewardOffset).plus(1);

    for (let i = 0; i < REWARDS.MILESTONES.length; i++) {
      if (milestone >= i) {
        multiplier = REWARDS.MILESTONES[i];

        if (height.isLessThan(this.distance)) {
          // Measure this.distance thus far
          amount = height.modulo(this.distance);
        } else {
          amount = new BigNumber(this.distance); // Assign completed milestone
          height = height.minus(this.distance); // Deduct from total height

          // After last milestone
          if (height.isGreaterThan(0) && i === REWARDS.MILESTONES.length - 1) {
            amount = height.plus(amount);
          }
        }

        rewards.push([amount, multiplier]);
      } else {
        break; // Milestone out of bounds
      }
    }

    for (let i = 0; i < rewards.length; i++) {
      const reward = rewards[i];
      supply = supply.plus(new BigNumber(reward[0]).multipliedBy(reward[1]));
    }

    return supply;
  }
}
