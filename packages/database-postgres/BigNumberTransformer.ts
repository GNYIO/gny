import { BigNumber } from 'bignumber.js';
import { ValueTransformer } from 'typeorm';

function isNullOrUndefined<T>(
  obj: T | null | undefined
): obj is null | undefined {
  return typeof obj === 'undefined' || obj === null;
}

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

export class BigNumberTransformerNullable implements ValueTransformer {
  /***
   * When writing to the Database
   */
  public to(toDb: BigNumber) {
    if (isNullOrUndefined(toDb)) {
      return toDb;
    }
    return toDb.toString();
  }

  /***
   * When loading from the Database
   */
  public from(fromDb: string) {
    if (isNullOrUndefined(fromDb)) {
      return fromDb;
    }
    return new BigNumber(fromDb);
  }
}
