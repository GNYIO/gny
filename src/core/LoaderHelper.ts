import { IBlock, IState, PeerNode } from '../interfaces';

export class LoaderHelper {
  public static GetBlockDifference(lastBlock: IBlock, commonBlock: IBlock) {
    const toRemove = Number(lastBlock.height) - Number(commonBlock.height);
    return toRemove;
  }
  public static IsLongFork(blockDifference: number) {
    return blockDifference >= 5;
  }
  public static TakeNewesterLastBlock(state: IState, lastBlock: IBlock) {
    // it is possible that some time is passed since
    // this function was called and since then some blocks
    // were processed, that means that `height` variable is
    // possible not up to date. Therefore the Math.max() call
    if (state.lastBlock.height > lastBlock.height) {
      return state.lastBlock;
    }
    return lastBlock;
  }
  public static ExtractPeerInfosMinusOne(peerNode: PeerNode) {
    return `${peerNode.host}:${peerNode.port - 1}`;
  }
}
