import { IBlock, PeerNode } from '@gny/interfaces';
import { IState } from '../globalInterfaces';
import { BigNumber } from 'bignumber.js';

export class LoaderHelper {
  public static GetBlockDifference(lastBlock: IBlock, commonBlock: IBlock) {
    const toRemove = new BigNumber(lastBlock.height)
      .minus(commonBlock.height)
      .toFixed();
    return toRemove;
  }
  public static IsLongFork(blockDifference: string) {
    return new BigNumber(blockDifference).isGreaterThanOrEqualTo(5);
  }
  public static TakeNewesterLastBlock(state: IState, lastBlock: IBlock) {
    // it is possible that some time is passed since
    // this function was called and since then some blocks
    // were processed, that means that `height` variable is
    // possible not up to date. Therefore the Math.max() call
    if (new BigNumber(state.lastBlock.height).isGreaterThan(lastBlock.height)) {
      return state.lastBlock;
    }
    return lastBlock;
  }

  /***
   * This function shuffles the array
   * It uses sideeffects. It doesn't return a new array but it shufles
   * the passed in array
   */
  public static shuffleArray<T>(array: Array<T>) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
