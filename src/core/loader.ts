import slots from '../utils/slots';
import { TIMEOUT } from '../utils/constants';
import {
  Modules,
  IScope,
  IGenesisBlock,
  PeerNode,
  IBlock,
  Transaction,
} from '../interfaces';
import { TransactionBase } from '../base/transaction';
import { BlocksHelper } from './BlocksHelper';
import { isPeerNode } from '../../packages/type-validation';
import { StateHelper } from './StateHelper';

export default class Loader {
  private isLoaded: boolean = false;
  private readonly library: IScope;
  private modules: Modules;

  constructor(scope: IScope) {
    this.library = scope;
  }

  private async findUpdate(
    lastBlock: IBlock | Pick<IBlock, 'height'>,
    peer: PeerNode
  ) {
    const peerStr = `${peer.host}:${peer.port - 1}`;

    let commonBlock: IBlock;
    try {
      commonBlock = await this.modules.blocks.getCommonBlock(
        peer,
        lastBlock.height
      );
    } catch (err) {
      this.library.logger.error('Failed to get common block:', err);
      throw err;
    }

    this.library.logger.info(
      `Found common block ${commonBlock.id} (at ${
        commonBlock.height
      }) with peer ${peerStr}, last block height is ${lastBlock.height}`
    );

    const toRemove = Number(lastBlock.height) - Number(commonBlock.height);

    if (toRemove >= 5) {
      this.library.logger.error(`long fork with peer ${peerStr}`);
      throw new Error(`long fork with peer ${peerStr}`);
    }

    try {
      StateHelper.ClearUnconfirmedTransactions();
      if (toRemove > 0) {
        await global.app.sdb.rollbackBlock(commonBlock.height);

        // TODO refactor
        let state = BlocksHelper.getState();
        state = BlocksHelper.SetLastBlock(state, global.app.sdb.lastBlock);
        BlocksHelper.setState(state);

        this.library.logger.debug(
          'set new last block',
          global.app.sdb.lastBlock
        );
      } else {
        await global.app.sdb.rollbackBlock(lastBlock.height);
      }
    } catch (e) {
      this.library.logger.error('Failed to rollback block', e);
      throw e;
    }
    this.library.logger.debug(`Loading blocks from peer ${peerStr}`);
    await this.modules.blocks.loadBlocksFromPeer(peer, commonBlock.id);
    return;
  }

  private async loadBlocks(
    lastBlock: IBlock | Pick<IBlock, 'height' | 'id'>,
    genesisBlock: IGenesisBlock
  ) {
    let result;
    try {
      result = await this.modules.peer.randomRequestAsync('getHeight', {});
    } catch (err) {
      throw err;
    }

    const ret = result.data;
    const peer = result.node;

    const peerStr = `${peer.host}:${peer.port - 1}`;
    this.library.logger.info(`Check blockchain on ${peerStr}`);

    ret.height = Number.parseInt(ret.height, 10);

    const schema = this.library.joi.object().keys({
      height: this.library.joi
        .number()
        .integer()
        .min(0)
        .required(),
    });
    const report = this.library.joi.validate(ret, schema);
    if (report.error) {
      this.library.logger.info(
        `Failed to parse blockchain height: ${peerStr}\n${report.error.message}`
      );
      throw new Error('Failed to parse blockchain height');
    }
    if (new global.app.util.bignumber(lastBlock.height).lt(ret.height)) {
      StateHelper.SetBlocksToSync(ret.height);

      if (lastBlock.id !== genesisBlock.id) {
        try {
          await this.findUpdate(lastBlock, peer);
          return;
        } catch (err) {
          this.library.logger.error(
            'error while calling loader.findUpdate()',
            err.messag
          );
          throw err;
        }
      }

      this.library.logger.debug(
        `Loading blocks from genesis from ${peer.host}:${peer.port - 1}`
      );
      return await this.modules.blocks.loadBlocksFromPeer(
        peer,
        this.library.genesisBlock.id
      );
    }
    return undefined;
  }

  // next
  private loadUnconfirmedTransactions = cb => {
    (async () => {
      let result;
      try {
        result = await this.modules.peer.randomRequestAsync(
          'getUnconfirmedTransactions',
          {}
        );
      } catch (err) {
        return cb(err.message);
      }

      const data = result.data;
      const peer = result.node as PeerNode;

      const schema = this.library.joi.object().keys({
        // Todo: better schema
        transactions: this.library.joi
          .array()
          .unique()
          .required(),
      });
      const report = this.library.joi.validate(data, schema);
      if (report.error) {
        return cb(report.error.message);
      }

      if (!isPeerNode(peer)) {
        return cb('validation of peer failed');
      }

      const transactions = data.transactions as Transaction[];
      const peerStr = `${peer.host}:${peer.port - 1}`;

      for (let i = 0; i < transactions.length; i++) {
        try {
          transactions[i] = TransactionBase.normalizeTransaction(
            transactions[i]
          );
        } catch (e) {
          this.library.logger.info(
            `Transaction ${
              transactions[i] ? transactions[i].id : 'null'
            } is not valid, ban 60 min`,
            peerStr
          );
          return cb('received transaction not valid');
        }
      }

      const trs: Transaction[] = [];
      for (let i = 0; i < transactions.length; ++i) {
        const one = transactions[i];
        if (!StateHelper.HasUnconfirmedTransaction(one.id)) {
          trs.push(one);
        }
      }
      this.library.logger.info(
        `Loading ${
          transactions.length
        } unconfirmed transaction from peer ${peerStr}`
      );
      return this.library.sequence.add((done: any) => {
        this.modules.transactions.processUnconfirmedTransactions(trs, done);
      }, cb);
    })();
  };

  // Public methods
  public startSyncBlocks = (lastBlock: IBlock) => {
    this.library.logger.debug('startSyncBlocks enter');
    if (!this.isLoaded || StateHelper.IsSyncing()) {
      this.library.logger.debug('blockchain is already syncing');
      return;
    }
    this.library.sequence.add(async cb => {
      this.library.logger.debug('startSyncBlocks enter sequence');
      StateHelper.SetIsSyncing(true);

      try {
        await this.loadBlocks(lastBlock, this.library.genesisBlock);
      } catch (err) {
        this.library.logger.warn('loadBlocks warning:', err.message);
      }
      StateHelper.SetIsSyncing(false);
      StateHelper.SetBlocksToSync(0);
      this.library.logger.debug('startSyncBlocks end');
      cb();
    });
  };

  public syncBlocksFromPeer = (peer: PeerNode) => {
    this.library.logger.debug('syncBlocksFromPeer enter');

    if (!this.isLoaded || StateHelper.IsSyncing()) {
      this.library.logger.debug('blockchain is already syncing');
      return;
    }
    this.library.sequence.add(async cb => {
      this.library.logger.debug('syncBlocksFromPeer enter sequence');
      StateHelper.SetIsSyncing(true);
      const lastBlock = BlocksHelper.getState().lastBlock; // TODO refactor whole method
      StateHelper.ClearUnconfirmedTransactions();
      try {
        await global.app.sdb.rollbackBlock(lastBlock.height);
      } catch (err) {
        this.library.logger.error('error while sdb.rollbackBlock()');

        // reset
        StateHelper.SetIsSyncing(false);
        throw err;
      }
      try {
        await this.modules.blocks.loadBlocksFromPeer(peer, lastBlock.id);
      } catch (err) {
        throw err;
      } finally {
        StateHelper.SetIsSyncing(false);
        this.library.logger.debug('syncBlocksFromPeer end');
        cb();
      }
    });
  };

  // Events
  public onPeerReady = () => {
    const nextSync = () => {
      const lastBlock = BlocksHelper.getState().lastBlock;
      const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
      if (slots.getNextSlot() - lastSlot >= 3) {
        this.startSyncBlocks(lastBlock);
      }
      setTimeout(nextSync, TIMEOUT * 1000);
    };
    setImmediate(nextSync);

    setImmediate(() => {
      if (!this.isLoaded || StateHelper.IsSyncing()) return;
      this.loadUnconfirmedTransactions(err => {
        if (err) {
          this.library.logger.warn('loadUnconfirmedTransactions timer:', err);
        }
      });
    });
  };

  public onBind = (scope: Modules) => {
    this.modules = scope;
  };

  public onBlockchainReady = () => {
    this.isLoaded = true;
  };

  public cleanup = (cb: any) => {
    this.library.logger.debug('Cleaning up core/loader');
    this.isLoaded = false;
    cb();
  };
}
