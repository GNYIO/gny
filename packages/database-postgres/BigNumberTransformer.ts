import { BigNumber } from 'bignumber.js';
import { ValueTransformer } from 'typeorm';

/***
 * usage: @Column({ transformer: new BigNumberTransformer() })
 * column -> gny: BigNumber;
 */
export class BigNumberTransformer implements ValueTransformer {
  /***
   * When writing to the Database
   */
  public to(toDb: BigNumber) {
    return toDb.toString();
  }

  /***
   * When loading from the Database
   */
  public from(fromDb: string) {
    return new BigNumber(fromDb);
  }
}
