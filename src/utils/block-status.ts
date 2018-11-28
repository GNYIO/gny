import * as constants from './constants';
import slots = require('./slots');

export default class BlockStatus {
  private readonly milestones = [
    198190000,
    71350000,
    23780000,
    1,
  ];

  private readonly firstStage = 3 * 365 * 24 * 60 * 60;
  private readonly secondStage = 5 * 365 * 24 * 60 * 60;
  private readonly thirdStage = 5 * 365 * 24 * 60 * 60;
  private readonly interval = slots.interval;

  // const distance = 3000000 // Distance between each milestone
  private rewardOffset = 1; // Start rewards at block (n)

  constructur () {
    if (global.Config.netVersion === 'mainnet') {
      // rewardOffset = 464500;
      // 60/15 * 60 * 24 = 5760
      this.rewardOffset = 30 * 24 * 60 * 60 / Number.parseInt(this.interval, 10)
    }
  }

  private parseHeight(height: any) {
    const h = Number.parseInt(height, 10)

    if (Number.isNaN(h)) {
      throw new Error('Invalid block height')
    } else {
      return Math.abs(h)
    }
  }


  public calcMilestone = (height: any) => {
    let location
    const ht = this.parseHeight(height - this.rewardOffset)
    if (ht < this.firstStage) {
      location = 0
    } else if (ht < (this.firstStage + this.secondStage)) {
      location = 1
    } else if (ht < (this.firstStage + this.secondStage + this.thirdStage)) {
      location = 2
    } else {
      location = 3
    }
    return location
  }

  public calcReward = (height: any) => {
    const h = this.parseHeight(height)

    if (h < this.rewardOffset || h <= 0) {
      return 0
    }
    return this.milestones[this.calcMilestone(height)]
  }

  public calcSupply = (h: any) => {
    const height = this.parseHeight(h) - this.rewardOffset + 1
    let supply = constants.totalAmount
    const rewards = []

    if (height <= 0) {
      return supply
    }

    let amount = 0
    let multiplier = 0
    if (height < this.firstStage) {
      amount = height
      multiplier = this.milestones[0]
      rewards.push([amount, multiplier])
    }
    if (height > this.firstStage && height < (this.firstStage + this.secondStage)) {
      amount = height - this.firstStage
      multiplier = this.milestones[1]
      rewards.push([amount, multiplier])
    }
    if (height > (this.firstStage + this.secondStage) && height < (this.firstStage + this.secondStage + this.thirdStage)) {
      amount = height - this.firstStage - this.secondStage
      multiplier = this.milestones[2]
      rewards.push([amount, multiplier])
    }
    if (height > (this.firstStage + this.secondStage + this.thirdStage)) {
      amount = height - this.firstStage - this.secondStage - this.thirdStage
      multiplier = this.milestones[3]
      rewards.push([amount, multiplier])
    }

    for (let i = 0; i < rewards.length; i++) {
      const reward = rewards[i]
      supply += reward[0] * reward[1]
    }

    return supply
  }
}