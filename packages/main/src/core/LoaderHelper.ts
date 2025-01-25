import {
  CommonBlockParams,
  CommonBlockResult,
  HeightWrapper,
  IBlock,
  ITracer,
} from '@gnyio/interfaces';
import BigNumber from 'bignumber.js';
import * as PeerId from 'peer-id';
import { ISpan } from '@gnyio/tracer';
import { Block } from '@gnyio/database-postgres';
import * as StateHelper from './StateHelper.js';
import { container, TYPES } from '@gnyio/container';
import { IP2PService } from '@gnyio/p2p';

export interface PeerIdCommonBlockHeight {
  peerId: PeerId;
  commonBlock: IBlock;
  height: string;
}

/***
 * This function shuffles the array
 * It uses sideeffects. It doesn't return a new array but it shufles
 * the passed in array
 */
export function shuffleArray<T>(array: Array<T>) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export async function contactEachPeer(
  allPeerInfos: any,
  lastBlock: IBlock,
  span: ISpan
) {
  const tracerService = container.get<ITracer>(TYPES.TracerService);

  const infoSpan = tracerService.startSpan('query multiple peers', {
    childOf: span.context(),
  });
  global.library.logger.info('[p2p] query multiple peers');

  const result: PeerIdCommonBlockHeight[] = [];

  for (let i = 0; i < allPeerInfos.length; ++i) {
    // request commonBlock from peer
    const collectInfoSpan = tracerService.startSpan('info from one peer', {
      childOf: infoSpan.context(),
    });

    // check if the peer is in the PeerStore?
    const currentPeerInfo = allPeerInfos[i];
    const currentPeerId = PeerId.createFromB58String(currentPeerInfo.id.id);
    collectInfoSpan.log({
      queryingPeer: currentPeerId,
    });

    let commonBlock: IBlock = null;
    try {
      const commonBlockResult: CommonBlockResult = await getCommonBlock(
        currentPeerId,
        String(lastBlock.height),
        collectInfoSpan
      );
      commonBlock = commonBlockResult.commonBlock;
      global.library.logger.info(
        `[p2p] found commonBlock. h: ${commonBlock.height}, id: ${
          commonBlock.id
        }`
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
      global.library.logger.error(
        `[p2p] error while querying peer for commonBlock: ${err.message}`
      );
      continue;
    }

    // request height from peer
    let heightWrapper: HeightWrapper = null;
    try {
      const p2pService = container.get<IP2PService>(TYPES.P2PService);

      heightWrapper = await p2pService.requestHeight(
        currentPeerId,
        collectInfoSpan
      );
      global.library.logger.info(
        `[p2p] got highest block height from peer. h: ${heightWrapper.height}`
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
      global.library.logger.error(
        `[p2p] error while querying height from peer: ${err.message}`
      );
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

  global.library.logger.info(
    `[p2p] found (${result.length}) PeerIdCommonBlockHeight`
  );

  infoSpan.finish();

  return result;
}

// todo look at core/loader
export async function getCommonBlock(
  peer: PeerId,
  lastBlockHeight: string,
  parentSpan: ISpan
): Promise<CommonBlockResult> {
  const params: CommonBlockParams = await getIdSequence2(
    lastBlockHeight,
    global.app.sdb.getBlocksByHeightRange
  );

  const tracerService = container.get<ITracer>(TYPES.TracerService);

  const span = tracerService.startSpan('get commonBlock', {
    childOf: parentSpan.context(),
  });
  span.log({
    getCommonBlockParams: params,
  });

  let ret: CommonBlockResult;
  try {
    const p2pService = container.get<IP2PService>(TYPES.P2PService);

    ret = await p2pService.requestCommonBlock(peer, params, span);
  } catch (err) {
    span.setTag('error', true);
    span.log({
      value: `[p2p][commonBlock] error: ${err.message}`,
    });
    span.finish();

    global.app.logger.info(`[p2p][commonBlock] error: ${err.message}`);
    return null;
  }

  span.log({
    value: 'requestCommonBlock finished successfully',
  });
  span.log({
    commonBlock: ret.commonBlock,
  });
  span.log({
    currentBlock: ret.currentBlock,
  });
  span.finish();

  return ret;
}

export async function getIdSequence2(
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

export function syncStrategy(
  peers: PeerIdCommonBlockHeight[],
  lastBlock: IBlock
) {
  if (
    peers === null ||
    peers === undefined ||
    (Array.isArray(peers) && peers.length === 0)
  ) {
    return {
      action: 'forge',
    };
  }

  const allPeersAreAtHeight0 = peers.every(p => p.height === String(0));
  if (
    new BigNumber(lastBlock.height).isEqualTo(0) &&
    allPeersAreAtHeight0 === true
  ) {
    return {
      action: 'forge',
    };
  }

  if (
    new BigNumber(lastBlock.height).isEqualTo(0) &&
    allPeersAreAtHeight0 === false
  ) {
    const peersSortedDescending = peers.sort((a, b) => {
      const res = new BigNumber(a.height).isGreaterThan(b.height);
      if (res === true) {
        return -1;
      }
      return 1;
    });
    const peerToSyncFrom = peersSortedDescending[0];
    return {
      action: 'sync',
      peerToSyncFrom: peerToSyncFrom.peerId,
    };
  }

  const peersWithSameCommonBlockAndHigherHight = peers
    .filter(x =>
      new BigNumber(x.commonBlock.height).isEqualTo(lastBlock.height)
    )
    .filter(x => new BigNumber(x.height).isGreaterThan(lastBlock.height));
  if (
    new BigNumber(lastBlock.height).isGreaterThan(0) &&
    peersWithSameCommonBlockAndHigherHight.length > 0
  ) {
    const first = peersWithSameCommonBlockAndHigherHight[0];
    return {
      action: 'sync',
      peerToSyncFrom: first.peerId,
    };
  }

  const peersWithCommonBlockWhereWeAreOneBehind = peers
    .filter(x =>
      new BigNumber(x.commonBlock.height).isEqualTo(
        new BigNumber(lastBlock.height).minus(1)
      )
    )
    .filter(x => new BigNumber(x.height).isGreaterThan(lastBlock.height));
  if (
    new BigNumber(lastBlock.height).isGreaterThan(0) &&
    peersWithCommonBlockWhereWeAreOneBehind.length > 0
  ) {
    const elegiblePeersDescending = peersWithCommonBlockWhereWeAreOneBehind.sort(
      (a, b) => {
        const res = new BigNumber(a.height).isGreaterThan(b.height);
        if (res === true) {
          return -1;
        }
        return 1;
      }
    );

    const first = elegiblePeersDescending[0];
    return {
      action: 'rollback',
      peerIdCommonBlockHeight: first,
    };
  }

  // default
  return {
    action: 'forge',
  };
}

export async function investigateFork(lastBlock: IBlock, parentSpan: ISpan) {
  const tracerService = container.get<ITracer>(TYPES.TracerService);

  const forkSpan = tracerService.startSpan('investigate fork', {
    childOf: parentSpan.context(),
  });
  forkSpan.finish();

  // clear unconfirmed transactions
  const clearUnconfirmedTrsSpan = tracerService.startSpan(
    'clear unconfirmed transactions',
    {
      childOf: forkSpan.context(),
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
    forkSpan.finish();

    return;
  }

  // rollback current block (to revert transactions)
  const revertCurrentBlockSpan = tracerService.startSpan(
    'rollback current block',
    {
      childOf: clearUnconfirmedTrsSpan.context(),
    }
  );
  try {
    revertCurrentBlockSpan.log({
      log: 'rolling back current block',
    });
    revertCurrentBlockSpan.log({
      lastBlock,
    });

    await global.app.sdb.rollbackBlock();

    // state management
    let state = StateHelper.getState();
    state = StateHelper.stateBeforeRollback(state.lastBlock);
    state.lastBlock = global.app.sdb.lastBlock;
    StateHelper.setState(state);

    revertCurrentBlockSpan.finish();
  } catch (err) {
    revertCurrentBlockSpan.finish();
    forkSpan.finish();

    // make sure that the actual lastBlock is set within the StateHelper
    const state = StateHelper.getState();
    state.lastBlock = global.app.sdb.lastBlock;
    StateHelper.setState(state);

    return;
  }

  // rollback to block minus1
  const rollbackToMinus1BlockSpan = tracerService.startSpan(
    'rollback block minus1',
    {
      childOf: revertCurrentBlockSpan.context(),
    }
  );
  try {
    // revert
    const targetBlockHeight = new BigNumber(lastBlock.height)
      .minus(1)
      .toFixed();

    rollbackToMinus1BlockSpan.log({
      log: `rolling block back from ${
        lastBlock.height
      } to: ${targetBlockHeight}`,
    });
    rollbackToMinus1BlockSpan.log({
      isSyncing: StateHelper.IsSyncing(),
    });

    await global.app.sdb.rollbackBlock(targetBlockHeight);

    // state management
    let state = StateHelper.getState();
    state = StateHelper.stateBeforeRollback(state.lastBlock); // unnecessary?
    state.lastBlock = global.app.sdb.lastBlock;
    StateHelper.setState(state);

    rollbackToMinus1BlockSpan.finish();
  } catch (err) {
    rollbackToMinus1BlockSpan.log({
      err,
    });
    rollbackToMinus1BlockSpan.setTag('error', true);
    rollbackToMinus1BlockSpan.finish();
    forkSpan.finish();

    // make sure that the actual lastBlock is set within the StateHelper
    const state = StateHelper.getState();
    state.lastBlock = global.app.sdb.lastBlock;
    StateHelper.setState(state);

    return;
  }
}
