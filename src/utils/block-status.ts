import constants = require('./constants');
import slots = require('./slots');

function BlockStatus() {
  // const milestones = [
  //   350000000,
  //   300000000,
  //   200000000,
  //   100000000,
  //   50000000,
  // ]

  const milestones = [
    198190000,
    71350000,
    23780000,
    1,
  ]

  const firstStage = 3 * 365 * 24 * 60 * 60
  const secondStage = 5 * 365 * 24 * 60 * 60
  const thirdStage = 5 * 365 * 24 * 60 * 60
  const interval = slots.interval

  // const distance = 3000000 // Distance between each milestone
  let rewardOffset = 1 // Start rewards at block (n)

  if (global.Config.netVersion === 'mainnet') {
    // rewardOffset = 464500;
    // 60/15 * 60 * 24 = 5760
    rewardOffset = 30 * 24 * 60 * 60 / Number.parseInt(interval, 10)
  }

  function parseHeight(height) {
    const h = Number.parseInt(height, 10)

    if (Number.isNaN(h)) {
      throw new Error('Invalid block height')
    } else {
      return Math.abs(h)
    }
  }

  // this.calcMilestone = (height) => {
  //   const location = Math.floor(parseHeight(height - rewardOffset) / distance)
  //   const lastMile = milestones[milestones.length - 1]

  //   if (location > (milestones.length - 1)) {
  //     return milestones.lastIndexOf(lastMile)
  //   }
  //   return location
  // }

  //   this.calcSupply = (h) => {
  //     let height = parseHeight(h)
  //     height -= height % 101
  //     const milestone = this.calcMilestone(height)
  //     let supply = constants.totalAmount
  //     const rewards = []

  //     if (height <= 0) {
  //       return supply
  //     }
  //     let amount = 0
  //     let multiplier = 0
  //     height = (height - rewardOffset) + 1
  //     for (let i = 0; i < milestones.length; i++) {
  //       if (milestone >= i) {
  //         multiplier = milestones[i];

  //         if (height <= 0) {
  //           break // Rewards not started yet
  //         } else if (height < distance) {
  //           amount = height % distance; // Measure distance thus far
  //         } else {
  //           amount = distance; // Assign completed milestone
  //         }
  //         rewards.push([amount, multiplier])
  //         height -= distance // Deduct from total height
  //       } else {
  //         break // Milestone out of bounds
  //       }
  //     }
  //     if (height > 0) {
  //       rewards.push([height, milestones[milestones.length - 1]])
  //     }

  //     for (i = 0; i < rewards.length; i++) {
  //       const reward = rewards[i];
  //       supply += reward[0] * reward[1]
  //     }

  //     if (rewardOffset <= 1) {
  //       supply -= milestones[0]
  //     }
  //     return supply
  //   }
  // }

  this.calcMilestone = (height) => {
    let location
    const ht = parseHeight(height - rewardOffset)
    if (ht < firstStage) {
      location = 0
    } else if (ht < (firstStage + secondStage)) {
      location = 1
    } else if (ht < (firstStage + secondStage + thirdStage)) {
      location = 2
    } else {
      location = 3
    }
    return location
  }

  this.calcReward = (height) => {
    const h = parseHeight(height)

    if (h < rewardOffset || h <= 0) {
      return 0
    }
    return milestones[this.calcMilestone(height)]
  }

  this.calcSupply = (h) => {
    const height = parseHeight(h) - rewardOffset + 1
    let supply = constants.totalAmount
    const rewards = []

    if (height <= 0) {
      return supply
    }

    let amount = 0
    let multiplier = 0
    if (height < firstStage) {
      amount = height
      multiplier = milestones[0]
      rewards.push([amount, multiplier])
    }
    if (height > firstStage && height < (firstStage + secondStage)) {
      amount = height - firstStage
      multiplier = milestones[1]
      rewards.push([amount, multiplier])
    }
    if (height > (firstStage + secondStage) && height < (firstStage + secondStage + thirdStage)) {
      amount = height - firstStage - secondStage
      multiplier = milestones[2]
      rewards.push([amount, multiplier])
    }
    if (height > (firstStage + secondStage + thirdStage)) {
      amount = height - firstStage - secondStage - thirdStage
      multiplier = milestones[3]
      rewards.push([amount, multiplier])
    }

    for (i = 0; i < rewards.length; i++) {
      const reward = rewards[i]
      supply += reward[0] * reward[1]
    }

    return supply
  }
}

export = BlockStatus
