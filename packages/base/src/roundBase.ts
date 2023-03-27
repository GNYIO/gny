import { DELEGATES } from '@gny/utils';
import BigNumber from 'bignumber.js';

export class RoundBase {
  public static calculateRound(height: string) {
    const first = new BigNumber(height).dividedToIntegerBy(DELEGATES).toFixed();
    const second = new BigNumber(height).modulo(DELEGATES).isGreaterThan(0)
      ? String(1)
      : String(0);

    const result = new BigNumber(first).plus(second).toFixed();
    return result;
  }

  public static getAllBlocksInRound(round: string): string[] {
    if (new BigNumber(round).isEqualTo(0)) {
      return ['0'];
    }

    if (new BigNumber(round).isEqualTo(1)) {
      // create an array of 101 elements
      // starting at 1
      return Array(101)
        .fill(1)
        .map((ind, val) => String(val + 1));
    }

    const start = new BigNumber(round)
      .times(101)
      .plus(1)
      .minus(101)
      .toFixed();

    return Array(101)
      .fill(start)
      .map((ind, x) => new BigNumber(ind).plus(x).toFixed());
  }
}
