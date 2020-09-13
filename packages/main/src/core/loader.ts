import { slots } from '@gny/utils';
import { TIMEOUT } from '@gny/utils';
import {
  PeerNode,
  IBlock,
  ITransaction,
  ICoreModule,
  UnconfirmedTransaction,
} from '@gny/interfaces';
import { TransactionBase } from '@gny/base';
import { BlocksHelper } from './BlocksHelper';
import { isPeerNode } from '@gny/type-validation';
import { StateHelper } from './StateHelper';
import Transactions from './transactions';
import Blocks from './blocks';
import Peer from './peer';
import { joi } from '@gny/extended-joi';
import { LoaderHelper } from './LoaderHelper';
import { BigNumber } from 'bignumber.js';

export default class Loader implements ICoreModule {
  public static async findUpdate(lastBlock: IBlock, peer: PeerNode) {
    let state = StateHelper.getState(); // TODO: refactor
    const newestLastBlock = LoaderHelper.TakeNewesterLastBlock(
      state,
      lastBlock
    );

    const peerStr = LoaderHelper.ExtractPeerInfosMinusOne(peer);

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
      }) with peer ${peerStr}, last block height is ${newestLastBlock.height}`
    );

    const toRemove: string = LoaderHelper.GetBlockDifference(
      newestLastBlock,
      commonBlock
    );

    if (LoaderHelper.IsLongFork(toRemove)) {
      global.library.logger.error(`long fork with peer ${peerStr}`);
      throw new Error(`long fork with peer ${peerStr}`);
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
    global.library.logger.debug(`Loading blocks from peer ${peerStr}`);
    await Blocks.loadBlocksFromPeer(peer, commonBlock.id);
    return;
  }

  public static async loadBlocks(lastBlock: IBlock, genesisBlock: IBlock) {
    let result;
    try {
      result = await Peer.randomRequestAsync('getHeight', {});
    } catch (err) {
      throw err;
    }

    const ret = result.data;
    const peer = result.node;

    const peerStr = `${peer.host}:${peer.port - 1}`;
    global.library.logger.info(`Check blockchain on ${peerStr}`);

    // TODO: check if really integer!
    ret.height = new BigNumber(ret.height).toFixed();

    const schema = joi.object().keys({
      height: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
    });
    const report = joi.validate(ret, schema);
    if (report.error) {
      global.library.logger.info(
        `Failed to parse blockchain height: ${peerStr}\n${report.error.message}`
      );
      throw new Error('Failed to parse blockchain height');
    }
    if (new BigNumber(lastBlock.height).lt(ret.height)) {
      StateHelper.SetBlocksToSync(ret.height);

      if (lastBlock.id !== genesisBlock.id) {
        try {
          await Loader.findUpdate(lastBlock, peer);
          return;
        } catch (err) {
          global.library.logger.error(
            `error while calling loader.findUpdate(): ${err.message}`
          );
          throw err;
        }
      }

      global.library.logger.debug(
        `Loading blocks from genesis from ${peer.host}:${peer.port - 1}`
      );
      return await Blocks.loadBlocksFromPeer(
        peer,
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
        global.library.logger.warn('loadBlocks warning:', err.message);
      }
      StateHelper.SetIsSyncing(false);
      StateHelper.SetBlocksToSync(0);
      global.library.logger.debug('startSyncBlocks end');
      cb();
    });
  };

  public static syncBlocksFromPeer = (peer: PeerNode) => {
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
