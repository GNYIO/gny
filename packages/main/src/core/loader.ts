import { IBlock, ICoreModule, HeightWrapper } from '@gny/interfaces';
import { StateHelper } from './StateHelper';
import { LoaderHelper } from './LoaderHelper';
import Blocks from './blocks';
import Peer from './peer';
import { BigNumber } from 'bignumber.js';
import * as PeerId from 'peer-id';
import { ISpan, getSmallBlockHash } from '@gny/tracer';
import { textSpanContainsPosition } from 'typescript';

export default class Loader implements ICoreModule {
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
      parentSpan.finish();

      return;
    }

    // randomize peers in allPeerInfos array
    LoaderHelper.shuffleArray(allPeerInfos);

    const firstPeerInfo = allPeerInfos[0];
    const firstPeerId = PeerId.createFromB58String(firstPeerInfo.id.id);

    // get height from peer
    const span = global.library.tracer.startSpan('request height from peer', {
      childOf: parentSpan.context(),
    });
    let heightWrapper: HeightWrapper = null;
    try {
      span.setTag('syncing', true);
      span.log({
        myLastBlock: lastBlock,
      });
      span.log({
        dialTo: firstPeerId.toB58String(),
      });

      heightWrapper = await Peer.p2p.requestHeight(firstPeerId, span);
      span.log({
        value: `target has height: ${heightWrapper.height}`,
      });
      global.library.logger.info(
        `[p2p] got height "${
          heightWrapper.height
        }" from ${firstPeerId.toB58String()}`
      );
      span.finish();
    } catch (err) {
      global.library.logger.info(
        `[p2p] failed to requestHeight() from ${err.message}`
      );
      span.log({
        value: `[p2p] failed to requestHeight() from ${err.message}`,
      });
      span.setTag('error', true);
      parentSpan.finish();
      span.finish();
    }

    if (heightWrapper === null) {
      return;
    }

    // if the target has a smaller height then we do, then return
    if (new BigNumber(heightWrapper.height).lt(lastBlock.height)) {
      const span = global.library.tracer.startSpan('target smaller height', {
        childOf: parentSpan.context(),
      });
      span.log({
        value: `the potential sync target ${firstPeerId.toB58String()} has the height ${
          heightWrapper.height
        }, we have the height ${lastBlock.height}`,
      });
      global.library.logger.info(
        `the potential sync target ${firstPeerId.toB58String()} has the height ${
          heightWrapper.height
        }, we have the height ${lastBlock.height}`
      );

      span.finish();
      parentSpan.finish();
      return;
    }

    // get commonBlock of target
    let commonBlock: IBlock = null;
    try {
      commonBlock = await Blocks.getCommonBlock(
        firstPeerId,
        String(lastBlock.height),
        parentSpan
      );
    } catch (err) {
      global.library.logger.info(
        `[p2p] failed to request commonBlock ${err.message}`
      );
      span.setTag('error', true);
      span.finish();
      parentSpan.finish();
      return;
    }

    if (commonBlock == null) {
      parentSpan.log({
        value: `no commonBlock with peer ${firstPeerId.toB58String()} found`,
      });

      parentSpan.finish();
      return;
    }

    // log commonBlock
    parentSpan.log({
      commonBlock,
    });

    // commonBlock is lastBlock I have, then start syncing
    if (new BigNumber(commonBlock.height).isEqualTo(lastBlock.height)) {
      return await Blocks.loadBlocksFromPeer(
        firstPeerId,
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
        const rollbackBlockSpan = global.library.tracer.startSpan(
          'rollback Block (height)',
          {
            childOf: span.context(),
          }
        );
        rollbackBlockSpan.log({
          lastBlock,
        });
        rollbackBlockSpan.setTag('height', lastBlock.height);
        rollbackBlockSpan.setTag('id', lastBlock.id);
        rollbackBlockSpan.setTag('hash', getSmallBlockHash(lastBlock));
        rollbackBlockSpan.finish();

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
        return cb(err);
      }
      try {
        // remove
        span.log({
          lastBlock,
        });

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
