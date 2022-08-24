import { IBlock, ICoreModule } from '@gny/interfaces';
import { StateHelper } from './StateHelper';
import { LoaderHelper, PeerIdCommonBlockHeight } from './LoaderHelper';
import Blocks from './blocks';
import Peer from './peer';
import { BigNumber } from 'bignumber.js';
import * as PeerId from 'peer-id';
import { ISpan, getSmallBlockHash } from '@gny/tracer';

export default class Loader implements ICoreModule {
  public static async silentlyContactPeers(
    lastBlock: IBlock,
    parentSpan: ISpan
  ) {
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

    const result: PeerIdCommonBlockHeight[] = await LoaderHelper.contactEachPeer(
      allPeerInfos,
      lastBlock,
      parentSpan
    );

    const filtered: PeerIdCommonBlockHeight[] = LoaderHelper.filterPeers(
      result,
      lastBlock,
      parentSpan
    );
    if (filtered.length === 0) {
      return null;
    }

    return {
      highestPeer: filtered[0],
      lastBlock,
      parentSpan,
    };
  }

  // Public methods
  public static startSyncBlocks = async () => {
    global.library.logger.debug('startSyncBlocks enter');
    if (!StateHelper.BlockchainReady()) {
      global.library.logger.debug(
        'blockchain not ready for Loader.startSyncBlocks'
      );
      global.library.logger.debug('startSyncBlocks end');
      return;
    }

    // here get infos about peers
    const lastBlock = StateHelper.getState().lastBlock;
    const parentSpan = global.library.tracer.startSpan('silently query peers');

    // in future only query 10 peers (at random)
    const result = await Loader.silentlyContactPeers(lastBlock, parentSpan);

    if (result === undefined) {
      global.library.logger.debug('startSyncBlocks end');
      parentSpan.log({
        log: 'no peers found',
      });
      parentSpan.setTag('warning', true);
      parentSpan.finish();
      return;
    }

    global.library.sequence.add(async cb => {
      const withinSeqSpan = global.library.tracer.startSpan('within sequence', {
        childOf: parentSpan.context(),
      });
      parentSpan.finish();

      // when we are still on the genesis Block
      // or commonBlock is our latest block
      if (
        new BigNumber(lastBlock.height).isEqualTo(0) ||
        new BigNumber(result.highestPeer.commonBlock.height).isEqualTo(
          lastBlock.height
        ) // is this necessary?
      ) {
        StateHelper.SetIsSyncing(true);
        await Blocks.loadBlocksFromPeer(
          result.highestPeer.peerId,
          lastBlock.id,
          withinSeqSpan
        );
        withinSeqSpan.finish();
        StateHelper.SetIsSyncing(false);
        return cb();
      }

      try {
        StateHelper.SetIsSyncing(true);
        await LoaderHelper.investigateFork(
          result.highestPeer,
          lastBlock,
          parentSpan
        );
        StateHelper.SetIsSyncing(false);
      } catch (err) {
        withinSeqSpan.log({
          log: 'error happend during investigation of fork',
        });
        withinSeqSpan.log({
          err,
        });
        withinSeqSpan.setTag('error', true);
        withinSeqSpan.finish();

        StateHelper.SetIsSyncing(false);
        return cb();
      }

      withinSeqSpan.finish();

      return cb();
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
