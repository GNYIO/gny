import { IBlock, ICoreModule } from '@gny/interfaces';
import { StateHelper } from './StateHelper';
import { LoaderHelper, PeerIdCommonBlockHeight } from './LoaderHelper';
import Blocks from './blocks';
import Peer from './peer';
import { BigNumber } from 'bignumber.js';
import * as PeerId from 'peer-id';
import { ISpan, getSmallBlockHash } from '@gny/tracer';

export default class Loader implements ICoreModule {
  public static async loadBlocksFromPeerProxy(
    peer: PeerId,
    id: string,
    parentSpan: ISpan
  ) {
    await Blocks.loadBlocksFromPeer(peer, id, parentSpan);
  }

  public static async silentlyContactPeers(
    lastBlock: IBlock,
    parentSpan: ISpan
  ) {
    parentSpan.log({
      lastBlock,
    });

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

    const decision = LoaderHelper.syncStrategy(result, lastBlock);
    parentSpan.log({
      decision: decision.action,
      numberOfPeers: result ? result.length : null,
    });
    return {
      decision,
      parentSpan,
    };
  }

  // Public methods
  public static syncBlocksFromPeer = (peer: PeerId, fireEvent = false) => {
    global.library.logger.debug('syncBlocksFromPeer enter');

    // do not check if IsReady(), because we call this function from core/peer
    // and IsReady is set after the initialization in core/peer
    // if IsReady was set to false, this function would exit too early
    if (StateHelper.IsSyncing()) {
      global.library.logger.debug('blockchain is already syncing');
      if (fireEvent === true) {
        global.library.bus.message('onPeerReady');
      }
      return;
    }

    const sequenceCallback = (err: Error) => {
      if (fireEvent === true) {
        setImmediate(() => {
          global.library.bus.message('onPeerReady');
        });
      }
    };

    global.library.sequence.add(
      async cb => {
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
      },
      undefined,
      sequenceCallback
    );
  };
}
