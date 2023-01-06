import 'reflect-metadata';
import { Connection } from 'typeorm';
import { loadConfig } from './config/loadConfig.js';
import { ILogger, IBlock, SmartDBOptions } from '@gny/interfaces';
import { EventEmitter } from 'events';
import { isString } from 'util';
import * as CodeContract from './codeContract.js';
import { DbSession } from './dbSession.js';
import { LogManager, LoggerWrapper } from './logger.js';
import { BlockCache } from './blockCache.js';
import * as _ from 'lodash';
import { ModelSchema } from './modelSchema.js';
import {
  LoadChangesHistoryAction,
  EntityChanges,
} from './basicEntityTracker.js';
import { Block } from './entity/Block.js';
import { BlockHistory } from './entity/BlockHistory.js';
import { createMetaSchema } from './createMetaSchema.js';
import BigNumber from 'bignumber.js';
import {
  Versioned,
  FindOneOptions,
  FindAllOptions,
  ArrayCondition,
  Condition,
} from './searchTypes.js';
import { RequireAtLeastOne } from 'type-fest';
import { Transaction } from './entity/Transaction.js';

export * from './entity/Account.js';
export * from './entity/Asset.js';
export * from './entity/Balance.js';
export * from './entity/Block.js';
export * from './entity/BlockHistory.js';
export * from './entity/Delegate.js';
export * from './entity/Issuer.js';
export * from './entity/Round.js';
export * from './entity/Transaction.js';
export * from './entity/Transfer.js';
export * from './entity/Variable.js';
export * from './entity/Vote.js';
export * from './entity/Mldata.js';
export * from './entity/Prediction.js';

export * from './basicEntityTracker';
export * from './lruEntityCache';
export * from './modelSchema';
export * from './createMetaSchema';
export * from './logger';
export * from './blockCache';
export * from './codeContract';
export * from './customCache';
export * from './defaultEntityUniqueIndex';
export * from './jsonSQLBuilder';
export * from './uniquedCache';

export type CommitBlockHook = (block: Block) => void;
export type Hooks = {
  name: string;
  hook: CommitBlockHook;
};

export type RollbackBlockHook = (fromHeight: string, toHeight: string) => void;
export type RHooks = {
  name: string;
  hook: RollbackBlockHook;
};

export class SmartDB extends EventEmitter {
  private options: SmartDBOptions;
  private originalLogger: ILogger;
  private commitBlockHooks: Hooks[];
  private rollbackBlockHooks: RHooks[];
  private schemas: Map<string, ModelSchema>;
  private log: LoggerWrapper;
  private cachedBlocks: BlockCache;
  private connection: Connection;
  private _lastBlockHeight?: string;
  private blockSession: DbSession;
  private currentBlock: Block;

  constructor(logger: ILogger, options?: SmartDBOptions) {
    super();

    this.originalLogger = logger;
    LogManager.setLogger(logger);

    this.options = options;
    this.options.cachedBlockCount = this.options.cachedBlockCount || 10;

    this.commitBlockHooks = [];
    this.rollbackBlockHooks = [];

    this.log = LogManager.getLogger('SmartDB');
    this.cachedBlocks = new BlockCache(this.options.cachedBlockCount);

    this._lastBlockHeight = undefined;

    // bind function to class
    this.getBlockByHeight = this.getBlockByHeight.bind(this);
    this.getBlocksByHeightRange = this.getBlocksByHeightRange.bind(this);
  }

  async init() {
    this.connection = await loadConfig(this.originalLogger, this.options);

    this.schemas = createMetaSchema();

    const history: LoadChangesHistoryAction = async (
      fromVersion: string,
      toVersion: string
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
      const transformed = new Map<string, EntityChanges[]>();
      result.map(bh =>
        transformed.set(bh.height, JSON.parse(bh.history) as EntityChanges[])
      );
      return transformed;
    };
    this.blockSession = new DbSession(this.connection, history, this.schemas);

    await this.loadMaxBlockHeight();
    await this.ensureLastBlockLoaded();

    await this.blockSession.initSerial(this.lastBlockHeight);

    await this.loadMemoryModels();

    this.emit('ready', this);
  }

  private async loadMemoryModels() {
    const schemas = Array.from(this.schemas).map(([key, value]) => ({
      key,
      value,
    }));
    for (let i = 0; i < schemas.length; ++i) {
      const one = schemas[i].value;
      if (one.memCached) {
        await this.blockSession.getMany(one, {}, true);
      }
    }
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

  private preCommitBlock(block: Block) {
    this.commitBlockHooks.forEach(oneHook => {
      return oneHook.hook(block);
    });
  }

  private postCommitBlock(block: Block) {
    this.emit('newBlock', block);
  }

  private preRollbackBlock(currentHeight: string, targetHeight: string) {
    this.rollbackBlockHooks.forEach(oneHook => {
      return oneHook.hook(currentHeight, targetHeight);
    });
  }

  private postRollbackBlock(currentHeight: string, targetHeight: string) {
    this.emit('rollbackBlock', {
      from: currentHeight,
      to: targetHeight,
    });
  }

  public registerCommitBlockHook(name: string, hookFunc: CommitBlockHook) {
    CodeContract.argument('hookFunc', () => CodeContract.notNull(hookFunc));
    CodeContract.argument('name', () => CodeContract.notNullOrWhitespace(name));

    CodeContract.argument(
      'name',
      this.commitBlockHooks.every(one => one.name !== name.trim()),
      "hook named '" + name + "' exist already"
    );
    this.commitBlockHooks.push({
      name: name,
      hook: hookFunc,
    });
  }

  public unregisterCommitBlockHook(name: string) {
    CodeContract.argument('name', () => CodeContract.notNullOrWhitespace(name));
    const index = this.commitBlockHooks.findIndex(
      one => one.name === name.trim()
    );

    if (index >= 0) {
      this.commitBlockHooks.slice(index);
    }
  }

  public registerRollbackBlockHook(name: string, hookFunc: RollbackBlockHook) {
    CodeContract.argument('hookFunc', () => CodeContract.notNull(hookFunc));
    CodeContract.argument('name', () => CodeContract.notNullOrWhitespace(name));

    CodeContract.argument(
      'name',
      this.rollbackBlockHooks.some(one => one.name === name.trim()),
      "hook named '" + name + "' exist already"
    );
    this.rollbackBlockHooks.push({
      name: name,
      hook: hookFunc,
    });
  }

  public unregisterRollbackBlockHook(name: string) {
    CodeContract.argument('name', () => CodeContract.notNullOrWhitespace(name));
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
    CodeContract.argument('block', () => CodeContract.notNull(block));

    // TODO refactor Number()
    CodeContract.argument(
      'block',
      new BigNumber(block.height).isEqualTo(
        new BigNumber(this.lastBlockHeight).plus(1)
      ),
      'invalid block height ' +
        block.height +
        ', last = ' +
        this.lastBlockHeight
    );

    this.log.info('BEGIN block height = ' + block.height);

    this.currentBlock = block;
  }

  public async commitBlock() {
    if (!this.currentBlock) {
      throw new Error('Current block is null');
    }

    this.log.trace('BEGIN commitBlock height = ' + this.currentBlock.height);

    this.preCommitBlock(this.currentBlock);
    const value = Object.assign({}, this.currentBlock);
    Reflect.deleteProperty(value, 'transactions');

    try {
      this._lastBlockHeight = new BigNumber(this._lastBlockHeight)
        .plus(1)
        .toFixed();

      await this.blockSession.saveChanges(
        value,
        this.blockSession.getChanges(),
        this.currentBlock.height
      );
      this.cachedBlocks.push(this.currentBlock);
      this.currentBlock = null;
      this.postCommitBlock(this.lastBlock);
      this.log.info('SUCCESS commitBlock height = ' + this.lastBlockHeight);
      return this.lastBlockHeight;
    } catch (err) {
      // @ts-ignore
      this.log.error(
        'FAILD commitBlock ( height = ' + this.currentBlock.height + ' )',
        err
      );

      throw err;
    }
  }

  public async rollbackBlock(height?: string) {
    CodeContract.argument(
      'height',
      !height ||
        new BigNumber(height).isLessThanOrEqualTo(this.lastBlockHeight),
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
      // 1. delete entitychange
      // 2. then delte block and blockhistory
      await this.blockSession.rollbackChanges(targetHeight);

      this._lastBlockHeight = new BigNumber(targetHeight).toFixed();
      this.cachedBlocks.evitUntil(targetHeight);

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

  /**
   * First it creates an entity only in cache and on the next
   * block-commit the corresponding entity is also created in the db
   * @param model
   * @param entity
   */
  public async create<T extends Versioned>(
    model: new () => T,
    entity: RequireAtLeastOne<T>
  ): Promise<T> {
    // TODO, no need for async
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    CodeContract.argument('entity', () => CodeContract.notNull(entity));

    const schema = this.getSchema(model, true);
    return this.getSession().create(schema, entity);
  }

  public async createOrLoad<T extends Versioned>(
    model: new () => T,
    entity: RequireAtLeastOne<T>
  ) {
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    CodeContract.argument('entity', () => CodeContract.notNull(entity));

    const schema = this.getSchema(model, true);
    const result = await this.load<T>(
      model,
      // @ts-ignore
      schema.getNormalizedPrimaryKey(entity)
    );
    return {
      create: undefined === result,
      entity: result || (await this.create(model, entity)),
    };
  }

  /**
   * First it increases properties of the entity only in cache and on the next
   * block-commit the corresponding entity properties are increased in the DB
   * @param model
   * @param increaseBy
   * @param key
   */
  public async increase<T extends Versioned>(
    model: new () => T,
    increaseBy: RequireAtLeastOne<T>,
    key: RequireAtLeastOne<T>
  ): Promise<Partial<T>> {
    // TODO, remove async
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    CodeContract.argument('increaseBy', () => CodeContract.notNull(increaseBy));
    CodeContract.argument('key', () => CodeContract.notNull(key));

    const sessionId = this.getSchema(model, true);
    return await this.getSession().increase(sessionId, key, increaseBy);
  }

  /**
   * First it updates the entity only in cache and on the next
   * block-commit the corresponding entity is updated from the DB
   * @param model
   * @param modifier
   * @param key
   */
  public async update<T extends Versioned>(
    model: new () => T,
    modifier: RequireAtLeastOne<T>,
    key: RequireAtLeastOne<T>
  ) {
    // TODO remove async
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    CodeContract.argument('modifier', () => CodeContract.notNull(modifier));
    CodeContract.argument('key', () => CodeContract.notNull(key));

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

  /**
   * First it deletes the entity only from cache and on the next
   * block-commit the corresponding entity is deleted from the DB
   * @param model
   * @param key
   */
  public async del<T extends Versioned>(
    model: new () => T,
    key: RequireAtLeastOne<T>
  ) {
    // TODO remove async
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    CodeContract.argument('key', () => CodeContract.notNull(key));

    const schema = this.getSchema(model, true);
    await this.getSession().delete(schema, key);
  }

  /**
   * 1. Tries to load entity from cache and returns entity if found in cache
   * 2. If the entity was not found cache - then it hits the DB and returns entity
   */
  public async load<T extends Versioned>(
    model: new () => T,
    key: RequireAtLeastOne<T>
  ): Promise<T> {
    // TODO remove async
    CodeContract.argument('model', () => CodeContract.notNull(model));
    CodeContract.argument('key', () => CodeContract.notNull(key));

    const schema = this.getSchema(model, true);
    return await this.getSession().load(schema, key);
  }

  /**
   * Looks only in cache. Does not hit the database.
   * WARNING: Does only work for memory-entities
   * @param model model name
   * @param key key of entity
   * @returns tracked entity from cache
   */
  public async get<T extends Versioned>(
    model: new () => T,
    key: RequireAtLeastOne<T>
  ): Promise<T> {
    // TODO remove async
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    CodeContract.argument('key', () => CodeContract.notNull(key));

    const schema = this.getSchema(model.name, true);
    CodeContract.argument(
      'model',
      schema.memCached,
      'get only supports memory models'
    );
    return this.getSession().getCachedEntity(schema, key);
  }

  /**
   * WARNING: get all cached entities (only memory entities)
   * @param model model name
   * @param filter filter result
   */
  public async getAll<T extends Versioned>(model: new () => T): Promise<T[]> {
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    const schema = this.getSchema(model.name, true);
    CodeContract.argument(
      'model',
      schema.memCached,
      'getAll only supports memory models'
    );
    return await this.getSession().getAll(schema);
  }

  /**
   * Access direct database without looking into the cache.
   * WARNING: when the condition returns more then one result an Exception is thrown
   * @param model
   * @param params
   */
  public async findOne<T extends Versioned>(
    model: new () => T,
    params: FindOneOptions<T>
  ): Promise<T> {
    const result = await this.findAll<T>(model, params);
    const schema = this.getSchema(model, true);
    if (result.length > 1) {
      throw new Error(
        "many entities found ( model = '" +
          schema.modelName +
          "' , params = '" +
          JSON.stringify(params) +
          "' )"
      );
    }
    return 0 === result.length ? undefined : result[0];
  }

  /**
   * Directly accesses DB, does not search in cache
   * WARNING: always use the "params.condition" object to specify a
   * filter condition, otherwise the
   * @param {string} model - e.g. "Account" or "Balance"
   * @param params
   */
  public async findAll<T extends Versioned>(
    model: new () => T,
    params: FindAllOptions<T>
  ): Promise<T[]> {
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    CodeContract.argument(
      'params',
      params !== undefined && params !== null,
      'params object was not provided'
    );
    CodeContract.argument(
      'params.condition',
      params.condition !== undefined && params.condition !== null,
      'condition object was not provided'
    );

    const schema = this.getSchema(model, true);
    return await this.blockSession.queryByJson(schema, params);
  }

  public async exists<T extends Versioned>(
    model: new () => T,
    key: Partial<T> | ArrayCondition<T>
  ) {
    CodeContract.argument('model', () => CodeContract.notNull(model.name));

    const schema = this.getSchema(model.name, true);
    return await this.getSession().exists(schema, key);
  }

  /**
   * Directly hits database and couts entries
   */
  public async count<T extends Versioned>(
    model: new () => T,
    condition: Condition<T>
  ) {
    CodeContract.argument('model', () => CodeContract.notNull(model.name));
    CodeContract.argument(
      'condition',
      condition !== undefined && condition !== null,
      'condition object was not provided'
    );

    const schema = this.getSchema(model.name, true);
    return await this.getSession().count(schema, condition);
  }

  private async loadMaxBlockHeight() {
    const height = await this.blockSession.getMaxBlockHeight();
    this._lastBlockHeight = height;
  }

  private async ensureLastBlockLoaded() {
    if (
      undefined === this.lastBlock &&
      new BigNumber(this.lastBlockHeight).isGreaterThanOrEqualTo(0)
    ) {
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

  public async getBlockByHeight(
    height: string,
    withTransactions?: false
  ): Promise<Block>;
  public async getBlockByHeight(
    height: string,
    withTransactions: true
  ): Promise<Block & { transactions: Transaction[] }>;

  public async getBlockByHeight(height: string, withTransactions = false) {
    CodeContract.argument(
      'height',
      new BigNumber(height).isGreaterThanOrEqualTo(0),
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
    const result = await this.attachTransactions([block]);
    return result[0];
  }

  public async getBlockById(
    id: string,
    withTransactions?: false // false is here used as a type
  ): Promise<Block>;
  public async getBlockById(
    id: string,
    withTransactions: true // true is here used as a type
  ): Promise<IBlock>;
  public async getBlockById(id: string, withTransactions = false) {
    CodeContract.argument('blockId', () =>
      CodeContract.notNullOrWhitespace(id)
    );

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
    const result = await this.attachTransactions([block]);
    return result[0];
  }

  public async getBlocksByHeightRange(
    min: string,
    max: string,
    withTransactions = false
  ) {
    CodeContract.argument(
      'minHeight, maxHeight',
      new BigNumber(min).isGreaterThanOrEqualTo(0) &&
        new BigNumber(max).isGreaterThanOrEqualTo(min),
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

  private async attachTransactions(blocks: Block[]): Promise<Array<IBlock>> {
    // TODO: make only one database call
    for (let i = 0; i < blocks.length; ++i) {
      const trans = await this.blockSession.getTransactionsByBlockHeight(
        blocks[i].height
      );
      // @ts-ignore
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

  public get lastBlockHeight() {
    // return this.blockDB.lastBlockHeight;
    return this._lastBlockHeight;
  }

  public get blocksCount() {
    return new BigNumber(this.lastBlockHeight).plus(1).toFixed();
  }

  public get lastBlock() {
    return this.cachedBlocks.get(this.lastBlockHeight);
  }
}
