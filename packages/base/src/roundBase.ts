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
}
