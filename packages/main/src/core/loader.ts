import { IBlock, ICoreModule } from '@gny/interfaces';
import { StateHelper } from './StateHelper';
import { LoaderHelper, PeerIdCommonBlockHeight } from './LoaderHelper';
import Blocks from './blocks';
import Peer from './peer';
import { BigNumber } from 'bignumber.js';
import * as PeerId from 'peer-id';
import { ISpan, getSmallBlockHash } from '@gny/tracer';

export default class Loader implements ICoreModule {
  public static async loadBlocks(lastBlock: IBlock, parentSpan: ISpan) {
    const allPeerInfos = Peer.p2p.getAllConnectedPeersPeerInfo();
    if (allPeerInfos.length === 0) {
      global.library.logger.info('[p2p] loadBlocks() no connected peers');

      const noPeersSpan = global.library.tracer.startSpan(
        'no connected peers',
        {
          childOf: parentSpan.context(),
        }
      );
      noPeersSpan.finish();
      return;
    }

    const result: Array<
      PeerIdCommonBlockHeight
    > = await LoaderHelper.contactEachPeer(allPeerInfos, lastBlock, parentSpan);

    let filtered: Array<PeerIdCommonBlockHeight> = null;
    try {
      filtered = LoaderHelper.filterPeers(result, lastBlock, parentSpan);
    } catch (err) {
      parentSpan.finish();
      return;
    }

    const highestPeer = filtered[0];

    // when we are still on the genesis Block
    // or commonBlock is our latest block
    if (
      new BigNumber(lastBlock.height).isEqualTo(0) ||
      new BigNumber(highestPeer.commonBlock.height).isEqualTo(lastBlock.height)
    ) {
      await Blocks.loadBlocksFromPeer(
        highestPeer.peerId,
        lastBlock.id,
        parentSpan
      );
      parentSpan.finish();
      return;
    }

    try {
      await LoaderHelper.investigateFork(highestPeer, lastBlock, parentSpan);
    } catch (err) {
      parentSpan.log({
        log: 'error happend during investigation of fork',
      });
      parentSpan.log({
        err,
      });
      parentSpan.setTag('error', true);
      parentSpan.finish();
      return;
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
        await Loader.loadBlocks(lastBlock, span);
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
        return cb();
      }
    });
  };
}
