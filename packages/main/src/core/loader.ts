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

    interface PeerIdCommonBlockHeight {
      peerId: PeerId;
      commonBlock: IBlock;
      height: string;
    }
    const result: Array<PeerIdCommonBlockHeight> = [];

    for (let i = 0; i < allPeerInfos.length; ++i) {
      const currentPeerInfo = allPeerInfos[i];
      const currentPeerId = PeerId.createFromB58String(currentPeerInfo.id.id);

      const commonBlockSpan = global.library.tracer.startSpan(
        'get information from peer',
        {
          childOf: parentSpan.context(),
        }
      );

      const heightSpan = global.library.tracer.startSpan('get height', {
        childOf: parentSpan.context(),
      });

      try {
        const commonBlock = await Blocks.getCommonBlock(
          currentPeerId,
          String(lastBlock.height),
          commonBlockSpan
        );

        if (commonBlock === null) {
          commonBlockSpan.setTag('error', true);
          commonBlockSpan.log({
            value: 'no common block found',
          });
          commonBlockSpan.finish();
          continue;
        }

        const heightWrapper: HeightWrapper = await Peer.p2p.requestHeight(
          currentPeerId,
          heightSpan
        );
        heightSpan.log({
          value: `received height: ${heightWrapper.height}`,
        });
        heightSpan.finish();

        const onePair: PeerIdCommonBlockHeight = {
          peerId: currentPeerId,
          commonBlock: commonBlock,
          height: heightWrapper.height,
        };
        result.push(onePair);

        commonBlockSpan.log(onePair);
        commonBlockSpan.finish();
      } catch (err) {
        commonBlockSpan.setTag('error', true);
        commonBlockSpan.log({
          error: err,
        });
        commonBlockSpan.finish();

        heightSpan.setTag('error', true);
        heightSpan.log({
          error: err,
        });
        heightSpan.finish();
      }
    }

    // filter for peers that have a higher height
    // sort descending
    const filtered = result
      .filter(x => new BigNumber(x.height).isGreaterThan(lastBlock.height))
      .sort((a, b) => new BigNumber(b.height).minus(a.height).toNumber());

    if (filtered.length === 0) {
      const span = global.library.tracer.startSpan('no eligible peers', {
        childOf: parentSpan.context(),
      });
      span.log({
        value: 'no eligible peers for syncing',
      });

      span.log(result);
      span.log(filtered);

      span.finish();
      return;
    }

    const highestPeer = filtered[0];

    // when we are still on the genesis Block
    if (new BigNumber(lastBlock.height).isEqualTo(0)) {
      const span = global.library.tracer.startSpan('sync from genesis block', {
        childOf: parentSpan.context(),
      });
      span.log({
        value: `starting to sync from peer ${
          highestPeer.peerId.id
        } with height ${highestPeer.commonBlock.height}`,
      });
      span.finish();
      return await Blocks.loadBlocksFromPeer(
        highestPeer.peerId,
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
