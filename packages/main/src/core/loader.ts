import { IBlock, ICoreModule, HeightWrapper } from '@gny/interfaces';
import { StateHelper } from './StateHelper';
import Blocks from './blocks';
import Peer from './peer';
import { BigNumber } from 'bignumber.js';
import * as PeerId from 'peer-id';
import { ISpan, getSmallBlockHash } from '@gny/tracer';

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
        span.setTag('dialTo', onePeerId.toB58String());
        span.log({
          value: `going to dial peer: ${onePeerId.toB58String()}`,
        });
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
        throw err;
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
