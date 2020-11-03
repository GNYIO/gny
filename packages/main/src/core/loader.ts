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
    const randomNode: PeerInfo = Peer.p2p.getConnectedRandomNodePeerInfo();
    if (!randomNode) {
      throw new Error('[p2p] no connected node found for loadBlocks()');
    }

    let result: HeightWrapper;
    try {
      result = await Peer.p2p.requestHeight(randomNode);
    } catch (err) {
      global.library.logger.error(
        `[syncing] could not requestHeight from peer: ${getB58String(
          randomNode
        )}`
      );
      global.library.logger.error(err);
      throw err;
    }

    global.library.logger.info(
      `[syncing] requestHeight: ${JSON.stringify(
        result,
        null,
        2
      )}, from ${getB58String(randomNode)}`
    );

    if (new BigNumber(lastBlock.height).lt(result.height)) {
      // TODO
      StateHelper.SetBlocksToSync(Number(result.height));

      if (lastBlock.id !== genesisBlock.id) {
        try {
          await Loader.findUpdate(lastBlock, randomNode);
          return;
        } catch (err) {
          global.library.logger.error(
            `error while calling loader.findUpdate(): ${err.message}`
          );
          throw err;
        }
      }

      global.library.logger.debug(
        `Loading blocks from genesis from ${JSON.stringify(randomNode)}`
      );
      return await Blocks.loadBlocksFromPeer(
        randomNode,
        global.library.genesisBlock.id
      );
    }
    return undefined;
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
