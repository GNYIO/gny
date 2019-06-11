import 'reflect-metadata';
import { Connection, ObjectLiteral } from 'typeorm';
import { loadConfig } from '../loadConfig';
import { ILogger } from '../../../src/interfaces';

import { EventEmitter } from 'events';
import { isString } from 'util';
import { CodeContract } from './codeContract';
import { DbSession } from './dbSession';
import { LogManager, LoggerWrapper } from './logger';
import { BlockCache } from './blockCache';
import * as performance from './performance';
import * as _ from 'lodash';
import { ModelSchema } from './modelSchema';
import { LoadChangesHistoryAction, EntityChanges } from './basicEntityTracker';
import { Block } from '../entity/Block';
import { BlockHistory } from '../entity/BlockHistory';
import { createMetaSchema } from './createMetaSchema';
import * as path from 'path';

export type CommitBlockHook = (block: Block) => void;
export type Hooks = {
  name: string;
  hook: CommitBlockHook;
};

export type RollbackBlockHook = (fromHeight: number, toHeight: number) => void;
export type RHooks = {
  name: string;
  hook: RollbackBlockHook;
};

export interface SmartDBOptions {
  cachedBlockCount?: number;
  maxBlockHistoryHold?: number;
  checkModifier?: boolean;
  configRaw: string;
}

export class SmartDB extends EventEmitter {
  public static readonly TRANSACTION_MODEL_NAME = 'Transaction';
  private options: SmartDBOptions;
  private originalLogger: ILogger;
  private commitBlockHooks: Hooks[];
  private rollbackBlockHooks: RHooks[];
  private schemas: Map<string, ModelSchema>;
  private log: LoggerWrapper;
  private cachedBlocks: BlockCache;
  private connection: Connection;
  private _lastBlockHeight?: number;
  private blockSession: DbSession;
  private currentBlock: Block;

  constructor(logger: ILogger, options?: SmartDBOptions) {
    super();

    this.originalLogger = logger;
    LogManager.setLogger(logger);

    this.options = options || {
      cachedBlockCount: 10,
      maxBlockHistoryHold: 10,
      configRaw: options.configRaw,
    };
    this.commitBlockHooks = [];
    this.rollbackBlockHooks = [];

    this.log = LogManager.getLogger('SmartDB');
    this.cachedBlocks = new BlockCache(this.options.cachedBlockCount);

    this._lastBlockHeight = undefined;
  }

  async init() {
    this.connection = await loadConfig(
      this.originalLogger,
      this.options.configRaw
    );

    this.schemas = createMetaSchema();

    const history: LoadChangesHistoryAction = async (
      fromVersion: number,
      toVersion: number
    ) => {
      const result = await this.connection
        .createQueryBuilder()
        .select('bh')
        .from(BlockHistory, 'bh')
        .where('bh.height >= :fromVersion AND bh.height <= :toVersion', {
          fromVersion,
          toVersion,
        })
        .getMany();
      const transformed = new Map<number, EntityChanges[]>();
      result.map(bh =>
        transformed.set(bh.height, JSON.parse(bh.history) as EntityChanges[])
      );
      return transformed;
    };
    this.blockSession = new DbSession(this.connection, history, this.schemas);

    await this.loadMaxBlockHeight();
    await this.ensureLastBlockLoaded();

    await this.blockSession.initSerial(this.lastBlockHeight);

    this.emit('ready', this);
  }

  private getSchema(
    model: string | { name: string },
    verifyIfRegistered = false
  ) {
    const id = isString(model) ? String(model) : model.name;
    const modelSchema = this.schemas.get(id);

    if (verifyIfRegistered) {
      CodeContract.verify(
        undefined !== modelSchema,
        "unregistered model '" + id + "'"
      );
    }
    return modelSchema;
  }

  private getSession() {
    // return s.isLocal ? this.localSession : this.blockSession;
    return this.blockSession;
  }

  private preCommitBlock(className: Block) {
    this.commitBlockHooks.forEach(oneHook => {
      return oneHook.hook(className);
    });
  }

  private postCommitBlock(block: Block) {
    this.emit('newBlock', block);
  }

  private preRollbackBlock(currentHeight: number, targetHeight: number) {
    this.rollbackBlockHooks.forEach(oneHook => {
      return oneHook.hook(currentHeight, targetHeight);
    });
  }

  private postRollbackBlock(currentHeight: number, targetHeight: number) {
    this.emit('rollbackBlock', {
      from: currentHeight,
      to: targetHeight,
    });
  }

  public registerCommitBlockHook(name: string, hookFunc: CommitBlockHook) {
    CodeContract.argument('hookFunc', function() {
      return CodeContract.notNull(hookFunc);
    });
    CodeContract.argument('name', function() {
      return CodeContract.notNullOrWhitespace(name);
    });
    CodeContract.argument(
      'name',
      this.commitBlockHooks.every(function(engineDiscovery) {
        return engineDiscovery.name !== name.trim();
      }),
      "hook named '" + name + "' exist already"
    );
    this.commitBlockHooks.push({
      name: name,
      hook: hookFunc,
    });
  }

  public unregisterCommitBlockHook(name: string) {
    CodeContract.argument('name', function() {
      return CodeContract.notNullOrWhitespace(name);
    });
    const index = this.commitBlockHooks.findIndex(function(engineDiscovery) {
      return engineDiscovery.name === name.trim();
    });
    if (index >= 0) {
      this.commitBlockHooks.slice(index);
    }
  }

  public registerRollbackBlockHook(name: string, hookFunc: RollbackBlockHook) {
    CodeContract.argument('hookFunc', function() {
      return CodeContract.notNull(hookFunc);
    });
    CodeContract.argument('name', function() {
      return CodeContract.notNullOrWhitespace(name);
    });
    CodeContract.argument(
      'name',
      this.rollbackBlockHooks.some(function(engineDiscovery) {
        return engineDiscovery.name === name.trim();
      }),
      "hook named '" + name + "' exist already"
    );
    this.rollbackBlockHooks.push({
      name: name,
      hook: hookFunc,
    });
  }

  public unregisterRollbackBlockHook(name: string) {
    CodeContract.argument('name', function() {
      return CodeContract.notNullOrWhitespace(name);
    });
    const index = this.rollbackBlockHooks.findIndex(one => {
      return one.name === name.trim();
    });
    if (index >= 0) {
      this.rollbackBlockHooks.slice(index);
    }
  }

  public async close() {
    await this.blockSession.close();
    this.emit('closed', this);
  }

  private lockInCurrentBlock(lockName: string, option = false) {
    return this.blockSession.lockInThisSession(lockName, option);
  }

  public lock(lockName: string) {
    this.lockInCurrentBlock(lockName, false);
  }

  public tryLock(lockName: string) {
    // unused
    return this.lockInCurrentBlock(lockName, true);
  }

  public beginContract() {
    this.blockSession.beginEntityTransaction();
  }

  public commitContract() {
    this.blockSession.commitEntityTransaction();
  }

  public rollbackContract() {
    this.blockSession.rollbackEntityTransaction();
  }

  public beginBlock(block: Block) {
    block.height = Number(block.height);
    CodeContract.argument('block', function() {
      return CodeContract.notNull(block);
    });
    // TODO refactor Number()
    CodeContract.argument(
      'block',
      Number(block.height) === this.lastBlockHeight + 1,
      'invalid block height ' +
        block.height +
        ', last = ' +
        this.lastBlockHeight
    );

    this.log.info('BEGIN block height = ' + block.height);

    this.currentBlock = block;
  }

  private async appendBlock(block: Block, changes: EntityChanges[]) {
    await this.connection
      .createQueryBuilder()
      .insert()
      .into(Block)
      .values([block])
      .execute();
    await this.connection
      .createQueryBuilder()
      .insert()
      .into(BlockHistory)
      .values([
        {
          height: block.height,
          history: JSON.stringify(changes, null, 2),
        },
      ])
      .execute();
  }

  private async deleteLastBlock(height: number) {
    // if (height !== this.lastBlockHeight) throw new Error("invalid last block height '" + token + "'");

    await this.connection
      .createQueryBuilder()
      .delete()
      .from(Block)
      .where('height = :height', { height })
      .execute();
    await this.connection
      .createQueryBuilder()
      .delete()
      .from(BlockHistory)
      .where('height = :height', { height })
      .execute();
    this._lastBlockHeight--;
  }

  public async commitBlock() {
    if (!this.currentBlock) {
      throw new Error('Current block is null');
    }

    this.log.trace('BEGIN commitBlock height = ' + this.currentBlock.height);

    this.preCommitBlock(this.currentBlock);
    const value = Object.assign({}, this.currentBlock);
    Reflect.deleteProperty(value, 'transactions');
    performance.Utils.Performace.time('Append block');
    // await this.blockDB.appendBlock(value, this.blockSession.getChanges());
    await this.appendBlock(value, this.blockSession.getChanges());

    this._lastBlockHeight++;
    performance.Utils.Performace.endTime();
    try {
      await this.blockSession.saveChanges(this.currentBlock.height);
      this.cachedBlocks.push(this.currentBlock);
      this.currentBlock = null;
      this.postCommitBlock(this.lastBlock);
      this.log.info('SUCCESS commitBlock height = ' + this.lastBlockHeight);
      return this.lastBlockHeight;
    } catch (err) {
      this.log.error(
        'FAILD commitBlock ( height = ' + this.currentBlock.height + ' )',
        err
      );
      await this.deleteLastBlock(value.height);

      throw err;
    }
  }

  public async rollbackBlock(height?: number) {
    CodeContract.argument(
      'height',
      !height || height <= this.lastBlockHeight,
      'height must less or equal lastBlockHeight ' + this.lastBlockHeight
    );
    const currentHeight = this.currentBlock
      ? this.currentBlock.height
      : this.lastBlockHeight;
    const targetHeight = undefined === height ? this.lastBlockHeight : height;
    this.log.trace(
      'BEGIN rollbackBlock ( height : ' +
        currentHeight +
        ' -> ' +
        targetHeight +
        ' )'
    );
    this.preRollbackBlock(currentHeight, targetHeight);
    try {
      await this.blockSession.rollbackChanges(targetHeight);
      for (; this.lastBlockHeight > targetHeight; ) {
        // await this.blockDB.deleteLastBlock(this.lastBlockHeight);
        await this.deleteLastBlock(this.lastBlockHeight);
        this.cachedBlocks.evitUntil(this.lastBlockHeight);
      }
      await this.ensureLastBlockLoaded();
      this.currentBlock = null;
      this.postRollbackBlock(currentHeight, targetHeight);

      this.log.info(
        'SUCCESS rollbackBlock ( height : ' +
          currentHeight +
          ' -> ' +
          targetHeight +
          ' )'
      );
    } catch (errorExpectedCommand) {
      this.log.error(
        'FAILD rollbackBlock ( height : ' +
          currentHeight +
          ' -> ' +
          targetHeight +
          ' )',
        errorExpectedCommand
      );
      throw errorExpectedCommand;
    }
  }

  public async create(model: string, entity: ObjectLiteral) {
    // TODO, no need for async
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument('entity', function() {
      return CodeContract.notNull(entity);
    });
    const schema = this.getSchema(model, true);
    return this.getSession().create(schema, entity);
  }

  public async createOrLoad(model: string, entity: ObjectLiteral) {
    // TODO, no need for async
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument('entity', function() {
      return CodeContract.notNull(entity);
    });
    const schema = this.getSchema(model, true);
    const result = await this.load(
      model,
      schema.getNormalizedPrimaryKey(entity)
    );
    return {
      create: undefined === result,
      entity: result || (await this.create(model, entity)),
    };
  }

  public async increase(
    model: string,
    increaseBy: ObjectLiteral,
    key: ObjectLiteral
  ) {
    // TODO, remove async
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument('increasements', function() {
      return CodeContract.notNull(increaseBy);
    });
    CodeContract.argument('key', function() {
      return CodeContract.notNull(key);
    });
    const sessionId = this.getSchema(model, true);
    return await this.getSession().increase(sessionId, key, increaseBy);
  }

  public async update(
    model: string,
    modifier: ObjectLiteral,
    key: ObjectLiteral
  ) {
    // TODO remove async
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument('modifier', function() {
      return CodeContract.notNull(modifier);
    });
    CodeContract.argument('key', function() {
      return CodeContract.notNull(key);
    });
    const schema = this.getSchema(model, true);
    if (true === this.options.checkModifier) {
      const modifierKeys = Object.keys(modifier);
      const checkForProps = _.without(modifierKeys, ...schema.properties);
      if (checkForProps.length > 0) {
        throw new Error(
          'modifier or entity contains property which is not defined in model (' +
            JSON.stringify(checkForProps) +
            ')'
        );
      }
    }
    await this.getSession().update(schema, key, modifier);
  }

  public async del(model: string, key: ObjectLiteral) {
    // TODO remove async
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument('key', function() {
      return CodeContract.notNull(key);
    });
    const schema = this.getSchema(model, true);
    await this.getSession().delete(schema, key);
  }

  /**
   * load entity from cache and database
   */
  public async load(model: string, key: ObjectLiteral) {
    // TODO remove async
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument('key', function() {
      return CodeContract.notNull(key);
    });
    const schema = this.getSchema(model, true);
    return await this.getSession().load(schema, key);
  }

  // async loadMany(record, strategy) {
  //   var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  //   CodeContract.argument('model', function() {
  //     return CodeContract.notNull(record);
  //   });
  //   const schema = this.getSchema(record, true);
  //   return await this.getSession().getMany(schema, strategy, callback);
  // }

  /**
   * WARNING: loads entity only from cache
   * @param model model name
   * @param key key of entity
   * @returns tracked entity from cache
   */
  public async get(model: string, key: ObjectLiteral) {
    // TODO remove async
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument('key', function() {
      return CodeContract.notNull(key);
    });
    const schema = this.getSchema(model, true);
    return this.getSession().getCachedEntity(schema, key);
  }

  /**
   * WARNING: get all cached entities (only cached entities)
   * @param model model name
   * @param filter filter result
   */
  public async getAll(model: string) {
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    const schema = this.getSchema(model, true);
    CodeContract.argument(
      'model',
      schema.memCached,
      'getAll only support for memory model'
    );
    return await this.getSession().getAll(schema);
  }

  public async findOne(model: string, condition: ObjectLiteral) {
    const result = await this.findAll(model, condition);
    const schema = this.getSchema(model, true);
    if (result.length > 1) {
      throw new Error(
        "many entities found ( model = '" +
          schema.modelName +
          "' , params = '" +
          JSON.stringify(condition) +
          "' )"
      );
    }
    return 0 === result.length ? undefined : result[0];
  }

  /**
   * Directly accesses DB, does not search in cache
   * @param {string} model - e.g. "Account" or "Balnace"
   * @param condition
   */
  public async findAll(model: string, condition: ObjectLiteral) {
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    const schema = this.getSchema(model, true);
    return await this.getSession().queryByJson(schema, condition);
  }

  public async exists(model: string, key: ObjectLiteral) {
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    const schema = this.getSchema(model, true);
    return await this.getSession().exists(schema, key);
  }

  public async count(model: string, condition: ObjectLiteral) {
    CodeContract.argument('model', function() {
      return CodeContract.notNull(model);
    });
    const schema = this.getSchema(model, true);
    return await this.getSession().count(schema, condition);
  }

  private async loadMaxBlockHeight() {
    const height = await this.blockSession.getMaxBlockHeight();
    this._lastBlockHeight = height;
  }

  private async ensureLastBlockLoaded() {
    if (undefined === this.lastBlock && this.lastBlockHeight >= 0) {
      const loadedBlock = await this.getBlockByHeight(
        this.lastBlockHeight,
        true
      );
      this.log.info(
        'SUCCESS load last block (height = ' +
          loadedBlock.height +
          ", id = '" +
          loadedBlock.id +
          "')"
      );
      this.cachedBlocks.push(loadedBlock);
    }
  }

  public async getBlockByHeight(height: number, withTransactions = false) {
    CodeContract.argument(
      'height',
      height >= 0,
      'height must great or equal zero'
    );
    const cachedBlock = this.copyCachedBlock(() => {
      return this.cachedBlocks.get(height);
    }, withTransactions);
    if (cachedBlock) {
      return cachedBlock;
    }
    const block = await this.blockSession.getBlockByHeight(height);
    if (block) {
      delete block._version_;
    }
    if (!withTransactions || undefined === block) {
      return block;
    }
    return await this.attachTransactions([block])[0];
  }

  public async getBlockById(id: string, withTransactions = false) {
    CodeContract.argument('blockId', function() {
      return CodeContract.notNullOrWhitespace(id);
    });
    const cachedBlock = this.copyCachedBlock(() => {
      return this.cachedBlocks.getById(id);
    }, withTransactions);
    if (cachedBlock) {
      delete cachedBlock._version_;
      return cachedBlock;
    }
    const block = await this.blockSession.getBlockById(id);
    if (block) {
      delete block._version_;
    }

    if (!withTransactions || undefined === block) {
      return block;
    }
    return await this.attachTransactions([block])[0];
  }

  public async getBlocksByHeightRange(
    min: number,
    max: number,
    withTransactions = false
  ) {
    CodeContract.argument(
      'minHeight, maxHeight',
      min >= 0 && max >= min,
      'minHeight or maxHeight is invalid'
    );
    const blocks = await this.blockSession.getBlocksByHeightRange(min, max);
    if (blocks) {
      blocks.forEach(item => {
        delete item._version_;
      });
    }
    if (withTransactions) {
      return await this.attachTransactions(blocks);
    } else {
      return blocks;
    }
  }

  private async getBlocksByIds(blockIds: string[], withTransactions = false) {
    CodeContract.argument('blockIds', function() {
      return CodeContract.notNull(blockIds);
    });
    const result = [];
    for (let i = 0; i < result.length; ++i) {
      const id = blockIds[i];
      const oneBlock = await this.getBlockById(id);
      result.push(oneBlock);
    }
    if (withTransactions) {
      const blocksWithTrans = await this.attachTransactions(result);
      return blocksWithTrans;
    } else {
      result;
    }
  }

  private async attachTransactions(blocks: Block[]) {
    // TODO: make only one database call
    for (let i = 0; i < blocks.length; ++i) {
      const trans = await this.blockSession.getTransactionsByBlockHeight(
        blocks[i].height
      );
      blocks[i].transactions = trans || [];
    }
    return blocks;
  }

  private copyCachedBlock(
    getCachedBlockFunc,
    withTransactions: boolean
  ): Block {
    const result = getCachedBlockFunc();
    if (undefined === result) {
      return;
    }
    const key = Object.assign({}, result);
    if (!withTransactions) {
      Reflect.deleteProperty(key, 'transactions');
    }
    return key;
  }

  private get transactionSchema() {
    return this.getSchema(SmartDB.TRANSACTION_MODEL_NAME, true);
  }

  public get lastBlockHeight() {
    // return this.blockDB.lastBlockHeight;
    return this._lastBlockHeight;
  }

  public get blocksCount() {
    return this.lastBlockHeight + 1;
  }

  public get lastBlock() {
    return this.cachedBlocks.get(this.lastBlockHeight);
  }
}
