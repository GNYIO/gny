import { PeerNode, IBlock, ICoreModule, HeightWrapper } from '@gny/interfaces';
import { BlocksHelper } from './BlocksHelper';
import { StateHelper } from './StateHelper';
import Blocks from './blocks';
import Peer from './peer';
import { LoaderHelper } from './LoaderHelper';
import { BigNumber } from 'bignumber.js';
import { isHeightWrapper } from '@gny/type-validation';
import * as PeerInfo from 'peer-info';
import { getB58String } from '@gny/p2p';

export default class Loader implements ICoreModule {
  public static async findUpdate(lastBlock: IBlock, peer: PeerInfo) {
    let state = StateHelper.getState(); // TODO: refactor
    const newestLastBlock = LoaderHelper.TakeNewesterLastBlock(
      state,
      lastBlock
    );

    let commonBlock: IBlock;
    try {
      commonBlock = await Blocks.getCommonBlock(peer, newestLastBlock.height);
    } catch (err) {
      const span = global.app.tracer.startSpan('findUpdate');
      span.setTag('error', true);
      span.log({
        value: `Failed to get common block: ${err}`,
      });
      span.finish();

      global.library.logger.error('Failed to get common block:');
      global.library.logger.error(err);
      throw err;
    }

    /*
    TODO: compare the received commonBlock with the savedCommonBlock
    it would be possible that a malicious Peer sends a "commonBlock"
    with the correct id but a smaller height and we rollback much more
    then we actually would need to
    */

    global.library.logger.info(
      `Found common block ${commonBlock.id} (at ${
        commonBlock.height
      }) with peer ${getB58String(peer)}, last block height is ${
        newestLastBlock.height
      }`
    );

    const toRemove: string = LoaderHelper.GetBlockDifference(
      newestLastBlock,
      commonBlock
    );

    if (LoaderHelper.IsLongFork(toRemove)) {
      const span = global.app.tracer.startSpan('findUpdate');
      span.setTag('error', true);
      span.log({
        value: `long fork with peer ${getB58String(peer)}`,
      });
      span.finish();

      global.library.logger.error(`long fork with peer ${getB58String(peer)}`);
      throw new Error(`long fork with peer ${getB58String(peer)}`);
    }

    try {
      StateHelper.ClearUnconfirmedTransactions();
      if (new BigNumber(toRemove).isGreaterThan(0)) {
        await global.app.sdb.rollbackBlock(commonBlock.height);

        // TODO refactor
        state = BlocksHelper.SetLastBlock(state, global.app.sdb.lastBlock);
        StateHelper.setState(state);

        global.library.logger.debug(
          `set new last block: ${JSON.stringify(
            global.app.sdb.lastBlock,
            null,
            2
          )}`
        );
      } else {
        await global.app.sdb.rollbackBlock(newestLastBlock.height);
      }
    } catch (e) {
      const span = global.app.tracer.startSpan('findUpdate');
      span.setTag('error', true);
      span.log({
        value: `Failed to rollback block ${e}`,
      });
      span.finish();

      global.library.logger.error('Failed to rollback block');
      global.library.logger.error(e);
      throw e;
    }
    global.library.logger.debug(
      `Loading blocks from peer ${getB58String(peer)}`
    );
    await Blocks.loadBlocksFromPeer(peer, commonBlock.id);
    return;
  }

  public static async loadBlocks(lastBlock: IBlock, genesisBlock: IBlock) {
    const allPeerInfos = Peer.p2p.getAllConnectedPeersPeerInfo();
    if (allPeerInfos.length === 0) {
      global.library.logger.info('[p2p] loadBlocks() no connected peers');
      return;
    }

    const myResult = [];

    // check
    for (let i = 0; i < allPeerInfos.length; ++i) {
      const one = allPeerInfos[i];

      try {
        const height: HeightWrapper = await Peer.p2p.requestHeight(one);

        myResult.push({
          peerInfo: one,
          height: height.height,
        });
      } catch (err) {
        global.library.logger.info(
          `[p2p] failed to requestHeight() from ${err.message}`
        );
      }
    }

    if (myResult.length === 0) {
      global.library.logger.info('[p2p] test');
      return;
    }

    const onlyHeights = myResult.map(x => x.height);
    global.library.logger.info(
      `[p2p], heights:  ${JSON.stringify(onlyHeights, null, 2)}`
    );
    const highest = BigNumber.max(...onlyHeights).toFixed();

    global.library.logger.info(`[p2p] highest ${highest}`);

    if (new BigNumber(lastBlock.height).isGreaterThanOrEqualTo(highest)) {
      global.library.logger.info(
        `[p2p] loadBlocks() highest peer ("${highest}") is NOT greater than current height ${
          lastBlock.height
        }`
      );
      return;
    }

    const find = myResult.find(x => x.height === highest);
    global.library.logger.info(`[p2p] find: ${JSON.stringify(find, null, 2)}`);
    const highestPeer = find.peerInfo;

    if (lastBlock.id === genesisBlock.id) {
      global.library.logger.info(
        `[p2p] current height is "0", start to sync from peer: ${getB58String(
          highestPeer
        )} with height ${find.height}`
      );
      return await Blocks.loadBlocksFromPeer(highestPeer, genesisBlock.id);
    } else {
      global.library.logger.info(
        `[p2p] current height is ${
          lastBlock.height
        }, start to sync from peer: ${getB58String(highestPeer)} with height ${
          find.height
        }`
      );
      return await Blocks.loadBlocksFromPeer(highestPeer, lastBlock.id);
    }
  }

  // Public methods
  public static startSyncBlocks = (lastBlock: IBlock) => {
    global.library.logger.debug('startSyncBlocks enter');
    if (!StateHelper.BlockchainReady() || StateHelper.IsSyncing()) {
      global.library.logger.debug('blockchain is already syncing');
      return;
    }
    global.library.sequence.add(async cb => {
      global.library.logger.debug('startSyncBlocks enter sequence');
      StateHelper.SetIsSyncing(true);

      try {
        await Loader.loadBlocks(lastBlock, global.library.genesisBlock);
      } catch (err) {
        global.library.logger.warn('loadBlocks warning:');
        global.library.logger.warn(err);
      }
      StateHelper.SetIsSyncing(false);
      StateHelper.SetBlocksToSync(0);
      global.library.logger.debug('startSyncBlocks end');
      cb();
    });
  };

  public static syncBlocksFromPeer = (peer: PeerInfo) => {
    global.library.logger.debug('syncBlocksFromPeer enter');

    if (!StateHelper.BlockchainReady() || StateHelper.IsSyncing()) {
      global.library.logger.debug('blockchain is already syncing');
      return;
    }
    global.library.sequence.add(async cb => {
      global.library.logger.debug('syncBlocksFromPeer enter sequence');
      StateHelper.SetIsSyncing(true);
      const lastBlock = StateHelper.getState().lastBlock; // TODO refactor whole method
      StateHelper.ClearUnconfirmedTransactions();
      try {
        await global.app.sdb.rollbackBlock(lastBlock.height);
      } catch (err) {
        const span = global.app.tracer.startSpan('syncBlocksFromPeer');
        span.setTag('error', true);
        span.log({
          value: 'error while sdb.rollbackBlock()',
        });
        span.finish();

        global.library.logger.error('error while sdb.rollbackBlock()');

        // reset
        StateHelper.SetIsSyncing(false);
        throw err;
      }
      try {
        await Blocks.loadBlocksFromPeer(peer, lastBlock.id);
      } catch (err) {
        throw err;
      } finally {
        StateHelper.SetIsSyncing(false);
        global.library.logger.debug('syncBlocksFromPeer end');
        cb();
      }
    });
  };
}
