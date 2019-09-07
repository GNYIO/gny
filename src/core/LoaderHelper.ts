import { IBlock, PeerNode } from '../../packages/interfaces';
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
  public static ExtractPeerInfosMinusOne(peerNode: PeerNode) {
    return `${peerNode.host}:${peerNode.port - 1}`;
  }
}
