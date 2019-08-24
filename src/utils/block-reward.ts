import { BigNumber } from 'bignumber.js';
import { REWARDS, INITIAL_AMOUNT } from './constants';
import * as _ from 'lodash';

export default class BlockReward {
  public distance: number;
  public rewardOffset: number;

  constructor() {
    this.distance = Math.floor(REWARDS.DISTANCE);
    this.rewardOffset = Math.floor(REWARDS.OFFSET);
  }

  private parseHeight(height: number) {
    if (isNaN(height)) {
      throw new Error('Invalid block height');
    } else {
      return Math.abs(height);
    }
  }

  private checkType(height: string | number | BigNumber) {
    const value = new BigNumber(height);
    if (value.isNaN() || !value.isFinite()) {
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

    const lastMilestone = _.last(REWARDS.MILESTONES);

    if (
      location.isGreaterThan(new BigNumber(REWARDS.MILESTONES.length).minus(1))
    ) {
      return REWARDS.MILESTONES.lastIndexOf(lastMilestone);
    }
    return location.absoluteValue().toNumber();
  }

  calculateReward(height: number) {
    height = this.parseHeight(height);

    if (height < this.rewardOffset) {
      return 0;
    }
    return REWARDS.MILESTONES[this.calculateMilestone(height)];
  }

  calculateSupply(height: number) {
    height = this.parseHeight(height);
    let supply = new BigNumber(INITIAL_AMOUNT);

    if (height < this.rewardOffset) {
      return supply;
    }

    const milestone = this.calculateMilestone(height);
    const rewards = [];

    let amount: number = 0;
    let multiplier: number = 0;
    height = height - this.rewardOffset + 1;

    for (let i = 0; i < REWARDS.MILESTONES.length; i++) {
      if (milestone >= i) {
        multiplier = REWARDS.MILESTONES[i];

        if (height < this.distance) {
          // Measure this.distance thus far
          amount = height % this.distance;
        } else {
          amount = this.distance; // Assign completed milestone
          height -= this.distance; // Deduct from total height

          // After last milestone
          if (height > 0 && i === REWARDS.MILESTONES.length - 1) {
            amount += height;
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
