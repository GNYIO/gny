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
import { joi } from '@gny/extendedJoi';
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
      global.library.logger.error('Failed to get common block:', err);
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
          'set new last block',
          global.app.sdb.lastBlock
        );
      } else {
        await global.app.sdb.rollbackBlock(newestLastBlock.height);
      }
    } catch (e) {
      global.library.logger.error('Failed to rollback block', e);
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
            'error while calling loader.findUpdate()',
            err.messag
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

  // next
  private static loadUnconfirmedTransactions = cb => {
    (async () => {
      let result;
      try {
        result = await Peer.randomRequestAsync(
          'getUnconfirmedTransactions',
          {}
        );
      } catch (err) {
        return cb(err.message);
      }

      const data = result.data;
      const peer = result.node as PeerNode;

      const schema = joi.object().keys({
        // Todo: better schema
        transactions: joi
          .array()
          .unique()
          .required(),
      });
      const report = joi.validate(data, schema);
      if (report.error) {
        return cb(report.error.message);
      }

      if (!isPeerNode(peer)) {
        return cb('validation of peer failed');
      }

      const transactions = data.transactions as Array<UnconfirmedTransaction>;
      const peerStr = `${peer.host}:${peer.port - 1}`;

      for (let i = 0; i < transactions.length; i++) {
        try {
          transactions[i] = TransactionBase.normalizeUnconfirmedTransaction(
            transactions[i]
          );
        } catch (e) {
          // TODO: check/correct statement below
          global.library.logger.info(
            `Transaction ${
              transactions[i] ? transactions[i].id : 'null'
            } is not valid, ban 60 min`,
            peerStr
          );
          return cb('received transaction not valid');
        }
      }

      const trs: Array<UnconfirmedTransaction> = [];
      for (let i = 0; i < transactions.length; ++i) {
        const one = transactions[i];
        if (!StateHelper.TrsAlreadyInUnconfirmedPool(one.id)) {
          trs.push(one);
        }
      }
      global.library.logger.info(
        `Loading ${
          transactions.length
        } unconfirmed transaction from peer ${peerStr}`
      );
      return global.library.sequence.add(done => {
        const state = StateHelper.getState();
        Transactions.processUnconfirmedTransactions(state, trs, done);
      }, cb);
    })();
  };

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

  // Events
  public static onPeerReady = () => {
    const nextSync = () => {
      const lastBlock = StateHelper.getState().lastBlock;
      const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
      if (slots.getNextSlot() - lastSlot >= 3) {
        Loader.startSyncBlocks(lastBlock);
      }
      setTimeout(nextSync, TIMEOUT * 1000);
    };
    setImmediate(nextSync);

    setImmediate(() => {
      if (!StateHelper.BlockchainReady() || StateHelper.IsSyncing()) return;
      Loader.loadUnconfirmedTransactions(err => {
        if (err) {
          global.library.logger.warn('loadUnconfirmedTransactions timer:', err);
        }
      });
    });
  };
}
