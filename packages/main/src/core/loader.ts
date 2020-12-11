import { IBlock, ICoreModule, HeightWrapper } from '@gny/interfaces';
import { BlocksHelper } from './BlocksHelper';
import { StateHelper } from './StateHelper';
import Blocks from './blocks';
import Peer from './peer';
import { LoaderHelper } from './LoaderHelper';
import { BigNumber } from 'bignumber.js';
import * as PeerId from 'peer-id';
import { ISpan } from '@gny/tracer';

export default class Loader implements ICoreModule {
  public static async findUpdate(lastBlock: IBlock, peer: PeerId) {
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
      }) with peer ${peer.toB58String()}, last block height is ${
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
        value: `long fork with peer ${peer.toB58String()}`,
      });
      span.finish();

      global.library.logger.error(`long fork with peer ${peer.toB58String()}`);
      throw new Error(`long fork with peer ${peer.toB58String()}`);
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
      `Loading blocks from peer ${peer.toB58String()}`
    );

    const span = global.library.tracer.startSpan('find update');

    await Blocks.loadBlocksFromPeer(peer, commonBlock.id, span);
    return;
  }

  public static async loadBlocks(
    lastBlock: IBlock,
    genesisBlock: IBlock,
    parentSpan: ISpan
  ) {
    const allPeerInfos = Peer.p2p.getAllConnectedPeersPeerInfo();
    if (allPeerInfos.length === 0) {
      global.library.logger.info('[p2p] loadBlocks() no connected peers');

      parentSpan.setTag('error', true);
      parentSpan.log({
        value: '[p2p] loadBlocks() no connected peers',
      });

      return;
    }

    const myResult = [];

    // check
    for (let i = 0; i < allPeerInfos.length; ++i) {
      const span = global.library.tracer.startSpan('request height from peer', {
        childOf: parentSpan.context(),
      });
      span.setTag('syncing', true);
      span.setTag('peerId', Peer.p2p.peerId.toB58String());

      const one = allPeerInfos[i];

      try {
        const onePeerId = PeerId.createFromB58String(one.id.id);
        const height: HeightWrapper = await Peer.p2p.requestHeight(
          onePeerId,
          span
        );

        myResult.push({
          peerInfo: one,
          height: height.height,
        });
      } catch (err) {
        global.library.logger.info(
          `[p2p] failed to requestHeight() from ${err.message}`
        );

        span.log({
          value: `[p2p] failed to requestHeight() from: "${one.id.id}"`,
        });
        span.log({
          value: `[p2p] failed to requestHeight() error: ${err.message}`,
        });
        span.setTag('error', true);
      }
      span.finish();
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

      parentSpan.setTag('error', true);
      parentSpan.log({
        value: `[p2p] loadBlocks() highest peer ("${highest}") is NOT greater than current height ${
          lastBlock.height
        }`,
      });
      parentSpan.finish();

      return;
    }

    const find = myResult.find(x => x.height === highest);
    global.library.logger.info(`[p2p] find: ${JSON.stringify(find, null, 2)}`);

    const highestPeer = PeerId.createFromB58String(find.peerInfo.id.id);

    if (lastBlock.id === genesisBlock.id) {
      global.library.logger.info(
        `[p2p] current height is "0", start to sync from peer: ${highestPeer.toB58String()} with height ${
          find.height
        }`
      );

      parentSpan.log({
        value: `[p2p] current height is "0", start to sync from peer: ${highestPeer.toB58String()} with height ${
          find.height
        }`,
      });
      parentSpan.finish();

      return await Blocks.loadBlocksFromPeer(
        highestPeer,
        genesisBlock.id,
        parentSpan
      );
    } else {
      global.library.logger.info(
        `[p2p] current height is ${
          lastBlock.height
        }, start to sync from peer: ${highestPeer.toB58String()} with height ${
          find.height
        }`
      );

      parentSpan.log({
        value: `[p2p] current height is ${
          lastBlock.height
        }, start to sync from peer: ${highestPeer.toB58String()} with height ${
          find.height
        }`,
      });
      parentSpan.finish();

      return await Blocks.loadBlocksFromPeer(
        highestPeer,
        lastBlock.id,
        parentSpan
      );
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

      const span = global.library.tracer.startSpan('start sync blocks');
      span.setTag('syncing', true);
      span.log({
        lastBlock,
      });

      try {
        await Loader.loadBlocks(lastBlock, global.library.genesisBlock, span);
      } catch (err) {
        global.library.logger.warn('loadBlocks warning:');
        global.library.logger.warn(err);

        span.setTag('error', true);
        span.log({
          value: `loadBlocks error: ${err.message}`,
        });
      }

      span.finish();

      StateHelper.SetIsSyncing(false);
      StateHelper.SetBlocksToSync(0);
      global.library.logger.debug('startSyncBlocks end');
      cb();
    });
  };

  public static syncBlocksFromPeer = (peer: PeerId) => {
    global.library.logger.debug('syncBlocksFromPeer enter');

    if (!StateHelper.BlockchainReady() || StateHelper.IsSyncing()) {
      global.library.logger.debug('blockchain is already syncing');
      return;
    }
    global.library.sequence.add(async cb => {
      global.library.logger.debug('syncBlocksFromPeer enter sequence');
      StateHelper.SetIsSyncing(true);

      const span = global.library.tracer.startSpan('sync blocks from peer');
      span.setTag('syncing', true);

      const lastBlock = StateHelper.getState().lastBlock; // TODO refactor whole method
      StateHelper.ClearUnconfirmedTransactions();
      try {
        await global.app.sdb.rollbackBlock(lastBlock.height);
      } catch (err) {
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
        span.finish();

        await Blocks.loadBlocksFromPeer(peer, lastBlock.id, span);
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
