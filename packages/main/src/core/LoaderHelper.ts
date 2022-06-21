import {
  CommonBlockParams,
  HeightWrapper,
  IBlock,
  PeerNode,
} from '@gny/interfaces';
import { IState } from '../globalInterfaces';
import { BigNumber } from 'bignumber.js';
import * as PeerId from 'peer-id';
import { ISpan } from '@gny/tracer';
import { Block } from '@gny/database-postgres';
import Peer from './peer';
import { isBlockWithoutTransactions } from '@gny/type-validation';
import { StateHelper } from './StateHelper';
import Blocks from './blocks';

export interface PeerIdCommonBlockHeight {
  peerId: PeerId;
  commonBlock: IBlock;
  height: string;
}

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

  public static async contactEachPeer(
    allPeerInfos: any,
    lastBlock: IBlock,
    span: ISpan
  ) {
    const infoSpan = global.library.tracer.startSpan('query multiple peers', {
      childOf: span.context(),
    });

    const result: PeerIdCommonBlockHeight[] = [];

    for (let i = 0; i < allPeerInfos.length; ++i) {
      // request commonBlock from peer
      const collectInfoSpan = global.library.tracer.startSpan(
        'info from one peer',
        {
          childOf: infoSpan.context(),
        }
      );

      // check if the peer is in the PeerStore?
      const currentPeerInfo = allPeerInfos[i];
      const currentPeerId = PeerId.createFromB58String(currentPeerInfo.id.id);
      collectInfoSpan.log({
        queryingPeer: currentPeerId,
      });

      let commonBlock: IBlock = null;
      try {
        commonBlock = await LoaderHelper.getCommonBlock(
          currentPeerId,
          String(lastBlock.height),
          collectInfoSpan
        );
      } catch (err) {
        collectInfoSpan.setTag('error', true);
        collectInfoSpan.log({
          log: 'error during commonBlock request',
        });

        collectInfoSpan.log({
          error: err,
        });
        collectInfoSpan.finish();
        continue;
      }

      // request height from peer
      let heightWrapper: HeightWrapper = null;
      try {
        heightWrapper = await Peer.p2p.requestHeight(
          currentPeerId,
          collectInfoSpan
        );
      } catch (err) {
        collectInfoSpan.log({
          log: 'error during request of height',
        });
        collectInfoSpan.log({
          err,
        });

        collectInfoSpan.setTag('error', true);
        collectInfoSpan.finish();
        continue;
      }

      const onePair: PeerIdCommonBlockHeight = {
        peerId: currentPeerId,
        commonBlock: commonBlock,
        height: heightWrapper.height,
      };
      result.push(onePair);

      collectInfoSpan.log({
        added: onePair,
      });
      collectInfoSpan.finish();
    }

    infoSpan.finish();

    return result;
  }

  // todo look at core/loader
  public static getCommonBlock = async (
    peer: PeerId,
    lastBlockHeight: string,
    parentSpan: ISpan
  ): Promise<IBlock> => {
    const params: CommonBlockParams = await LoaderHelper.getIdSequence2(
      lastBlockHeight,
      global.app.sdb.getBlocksByHeightRange
    );

    const span = global.app.tracer.startSpan('get commonBlock', {
      childOf: parentSpan.context(),
    });
    span.log({
      getCommonBlockParams: params,
    });

    let ret: IBlock;
    try {
      ret = await Peer.p2p.requestCommonBlock(peer, params, span);
    } catch (err) {
      span.setTag('error', true);
      span.log({
        value: `[p2p][commonBlock] error: ${err.message}`,
      });
      span.finish();

      global.app.logger.info(`[p2p][commonBlock] error: ${err.message}`);
      return null;
    }

    if (!isBlockWithoutTransactions(ret)) {
      span.setTag('error', true);
      span.log({
        value: `[p2p][commonBlock] transactions failed`,
        ret,
      });
      span.finish();
      return null;
    }

    span.log({
      value: 'requestCommonBlock finished successfully',
    });
    span.log({
      commonBlock: ret,
    });
    span.finish();

    return ret;
  };

  public static async getIdSequence2(
    height: string,
    getBlocksByHeightRange: (min: string, max: string) => Promise<Block[]>
  ) {
    try {
      const maxHeight = height;
      const minHeight = BigNumber.maximum(
        0,
        new BigNumber(maxHeight).minus(4).toFixed()
      ).toFixed();
      let blocks = await getBlocksByHeightRange(minHeight, maxHeight);
      blocks = blocks.reverse();
      const ids = blocks.map(b => b.id);
      const result: CommonBlockParams = {
        ids,
        min: minHeight,
        max: maxHeight,
      };
      return result;
    } catch (e) {
      throw new Error('getIdSequence2 failed');
    }
  }

  public static filterPeers(
    peers: Array<PeerIdCommonBlockHeight>,
    lastBlock: IBlock,
    parentSpan: ISpan
  ) {
    const span = global.library.tracer.startSpan('filter eligible peers', {
      childOf: parentSpan.context(),
    });

    // filter for peers that have a higher height
    // sort descending
    const filtered = peers
      .filter(x => new BigNumber(x.height).isGreaterThan(lastBlock.height))
      .sort((a, b) => new BigNumber(b.height).minus(a.height).toNumber());

    if (filtered.length === 0) {
      span.log({
        value: 'no eligible peers for syncing',
      });

      span.log(filtered);

      span.finish();
      throw new Error('no elegible peers');
    }

    return filtered;
  }
  public static async investigateFork(
    highestPeer: PeerIdCommonBlockHeight,
    lastBlock: IBlock,
    parentSpan: ISpan
  ) {
    const forkSpan = global.library.tracer.startSpan('investigate fork', {
      childOf: parentSpan.context(),
    });

    if (
      new BigNumber(highestPeer.commonBlock.height)
        .plus(1)
        .isEqualTo(lastBlock.height)
    ) {
      const revertSpan = global.library.tracer.startSpan(
        'forked 1 block (reverting)',
        {
          childOf: forkSpan.context(),
        }
      );

      const clearUnconfirmedTrsSpan = global.library.tracer.startSpan(
        'clear unconfirmed transactions',
        {
          childOf: revertSpan.context(),
        }
      );

      try {
        StateHelper.ClearUnconfirmedTransactions();

        clearUnconfirmedTrsSpan.finish();
      } catch (err) {
        clearUnconfirmedTrsSpan.log({
          err,
        });
        clearUnconfirmedTrsSpan.setTag('error', true);
        clearUnconfirmedTrsSpan.finish();
        revertSpan.finish();
        forkSpan.finish();

        return;
      }

      const old = StateHelper.getState();
      let state = StateHelper.copyState(old);
      state = StateHelper.stateBeforeRollback(state.lastBlock);

      try {
        revertSpan.log({
          log: 'rolling back block...',
        });

        // revert
        const targetBlockHeight = new BigNumber(lastBlock.height)
          .minus(1)
          .toFixed();

        revertSpan.log({
          log: `rolling block back from ${
            lastBlock.height
          } to: ${targetBlockHeight}`,
        });
        revertSpan.log({
          isSyncing: StateHelper.IsSyncing(),
        });

        await global.app.sdb.rollbackBlock(targetBlockHeight);
      } catch (err) {
        revertSpan.log({
          err,
        });
        revertSpan.setTag('error', true);
        revertSpan.finish();
        forkSpan.finish();
        return;
      }

      const sdbLastBlock = global.app.sdb.lastBlock;
      state.lastBlock = sdbLastBlock;
      StateHelper.setState(state);

      // should I call StateHelper.getState() instead ???
      revertSpan.log({
        log: 'successfully rolled back block',
      });

      revertSpan.finish();

      const syncFromPeerSpan = global.library.tracer.startSpan(
        'after rollback sync from peer',
        {
          childOf: revertSpan.context(),
        }
      );

      await Blocks.loadBlocksFromPeer(
        highestPeer.peerId,
        sdbLastBlock.id,
        syncFromPeerSpan
      );
      syncFromPeerSpan.finish();
    }

    forkSpan.finish();
  }
}
