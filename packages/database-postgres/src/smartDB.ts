import 'reflect-metadata';
import { Connection, getConnection, MoreThan } from 'typeorm';

import { Account } from '../entity/Account';
import { Asset } from '../entity/Asset';
import { Balance } from '../entity/Balance';
import { Block } from '../entity/Block';
import { Delegate } from '../entity/Delegate';
import { Issuer } from '../entity/Issuer';
import { Round } from '../entity/Round';
import { Transaction } from '../entity/Transaction';
import { Transfer } from '../entity/Transfer';
import { Variable } from '../entity/Variable';
import { Vote } from '../entity/Vote';

import { loadConfig } from '../loadConfig';
import { ILogger } from '../../../src/interfaces';

const ENTITY: any = {
  'Account': Account,
  'Asset': Asset,
  'Balance': Balance,
  'Block': Block,
  'Delegate': Delegate,
  'Issuer': Issuer,
  'Round': Round,
  'Transaction': Transaction,
  'Variable': Variable,
  'Vote': Vote,
  'Transfer': Transfer
};


import { EventEmitter } from 'events';
import { isString } from 'util';
import { CodeContract } from './codeContract';
import { DbSession } from './dbSession';
import { LogManager, LoggerWrapper } from './logger';
import { BlockCache } from './blockCache';
import * as performance from './performance';
import * as _ from 'lodash';

export class SmartDB extends EventEmitter {

  public static readonly TRANSACTION_MODEL_NAME = 'Transaction';
  private options: any;
  originalLogger: ILogger; // TODO: refactor
  private commitBlockHooks: Array<any>;
  private rollbackBlockHooks: Array<any>;
  private schemas: Map<any, any>;
  private log: LoggerWrapper;
  private cachedBlocks: BlockCache;
  connection: Connection;
  private _lastBlockHeight?: number;
  private blockSession: DbSession;

  constructor(logger: ILogger, options?) {
    super();

    this.originalLogger = logger;
    LogManager.setLogger(logger);

    this.options = options || {
      cachedBlockCount : 10,
      maxBlockHistoryHold : 10
    };
    this.commitBlockHooks = [];
    this.rollbackBlockHooks = [];
    this.schemas = new Map<string, {}>();

    Object.keys(ENTITY).forEach((name) => {
      this.schemas.set(name, ENTITY[name]);
    });

    this.log = LogManager.getLogger("SmartDB");
    this.cachedBlocks = new BlockCache(this.options.cachedBlockCount);

    this._lastBlockHeight = undefined;
  }

  async init() {
    this.connection = await loadConfig(this.originalLogger);

    // TODO: fix loadHistoryFromLevelDB
    const history = new Map();
    this.blockSession = new DbSession(this.connection, history);

    await this.loadMaxBlockHeight();
    await this.ensureLastBlockLoaded();

    await this.blockSession.initSerial(this.lastBlockHeight);

    this.emit("ready", this);
  }

  getSchema(model: string | { name: string }, verifyIfRegistered = false, verifyIfReadonly = false) {
    const id = isString(model) ? String(model) : model.name;
    const modelSchema = this.schemas.get(id);

    if (verifyIfRegistered) {
      CodeContract.verify(undefined !== modelSchema, "unregistered model '" + id + "'");
    }
    if (verifyIfReadonly) { // remove this check and parameter
      CodeContract.verify(!modelSchema.isReadonly, "model '" + id + "' is readonly");
    }
    return modelSchema;
  }

  // async loadHistroyFromLevelDB(e, exceptionLevel) {
  //   return await this.blockDB.getHistoryChanges(e, exceptionLevel);
  // }

  getSession() { // private
    // return s.isLocal ? this.localSession : this.blockSession;
    return this.blockSession;
  }

  preCommitBlock(className) {
    this.commitBlockHooks.forEach(function(surface) {
      return surface.hook(className);
    });
  }

  postCommitBlock(selector) {
    this.emit("newBlock", selector);
  }

  preRollbackBlock(name, callback) {
    this.rollbackBlockHooks.forEach(function(mw) {
      return mw.hook(name, callback);
    });
  }

  postRollbackBlock(user, output) {
    this.emit("rollbackBlock", {
      from : user,
      to : output
    });
  }

  registerCommitBlockHook(name, hookFunc) {
    CodeContract.argument("hookFunc", function() {
      return CodeContract.notNull(hookFunc);
    });
    CodeContract.argument("name", function() {
      return CodeContract.notNullOrWhitespace(name);
    });
    CodeContract.argument("name", this.commitBlockHooks.every(function(engineDiscovery) {
      return engineDiscovery.name !== name.trim();
    }), "hook named '" + name + "' exist already");
    this.commitBlockHooks.push({
      name : name,
      hook : hookFunc
    });
  }

  unregisterCommitBlockHook(name) {
    CodeContract.argument("name", function() {
      return CodeContract.notNullOrWhitespace(name);
    });
    var forTokenLength = this.commitBlockHooks.findIndex(function(engineDiscovery) {
      return engineDiscovery.name === name.trim();
    });
    if (forTokenLength >= 0) {
      this.commitBlockHooks.slice(forTokenLength);
    }
  }

  registerRollbackBlockHook(name, hookFunc) {
    CodeContract.argument("hookFunc", function() {
      return CodeContract.notNull(hookFunc);
    });
    CodeContract.argument("name", function() {
      return CodeContract.notNullOrWhitespace(name);
    });
    CodeContract.argument("name", this.rollbackBlockHooks.some(function(engineDiscovery) {
      return engineDiscovery.name === name.trim();
    }), "hook named '" + name + "' exist already");
    this.rollbackBlockHooks.push({
      name : name,
      hook : hookFunc
    });
  }

  unregisterRollbackBlockHook(name) {
    CodeContract.argument("name", function() {
      return CodeContract.notNullOrWhitespace(name);
    });
    var forTokenLength = this.rollbackBlockHooks.findIndex(function(engineDiscovery) {
      return engineDiscovery.name === name.trim();
    });
    if (forTokenLength >= 0) {
      this.rollbackBlockHooks.slice(forTokenLength);
    }
  }

  async close() {
    await this.blockSession.close();
    this.emit("closed", this);
  }

  lockInCurrentBlock(lockName) {
    var artistTrack = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    return this.blockSession.lockInThisSession(lockName, artistTrack);
  }

  lock(lockName) {
    this.lockInCurrentBlock(lockName, false);
  }

  tryLock(lockName) {
    return this.lockInCurrentBlock(lockName, true);
  }

  beginContract() {
    this.blockSession.beginEntityTransaction();
  }

  commitContract() {
    this.blockSession.commitEntityTransaction();
  }

  rollbackContract() {
    this.blockSession.rollbackEntityTransaction();
  }


  beginBlock(block) {
    CodeContract.argument("block", function() {
      return CodeContract.notNull(block);
    });
    CodeContract.argument("block", block.height === this.lastBlockHeight + 1, "invalid block height " + block.height + ", last = " + this.lastBlockHeight);

    this.log.info("BEGIN block height = " + block.height);

    /** @type {!Object} */
    this.currentBlock = block;
  }

  async commitBlock() {
    if (!this.currentBlock) {
      throw new Error("Current block is null");
    }

    this.log.trace("BEGIN commitBlock height = " + this.currentBlock.height);

    this.preCommitBlock(this.currentBlock);
    var value = Object.assign({}, this.currentBlock);
    Reflect.deleteProperty(value, "transactions");
    performance.Utils.Performace.time("Append block");
    // await this.blockDB.appendBlock(value, this.blockSession.getChanges());

    this._lastBlockHeight++;
    await this.create('Block', this.currentBlock);
    performance.Utils.Performace.endTime();
    try {
       await this.blockSession.saveChanges(this.currentBlock.height);
       this.cachedBlocks.push(this.currentBlock);
       this.currentBlock = null;
       this.postCommitBlock(this.lastBlock);
       this.log.info("SUCCESS commitBlock height = " + this.lastBlockHeight);
       return this.lastBlockHeight;
    } catch (err) {
       this.log.error("FAILD commitBlock ( height = " + this.currentBlock.height + " )", err);
       throw err;
    }
  }

  async rollbackBlock(height) {
    CodeContract.argument("height", !height || height <= this.lastBlockHeight, "height must less or equal lastBlockHeight " + this.lastBlockHeight);
    var currentHeight = this.currentBlock ? this.currentBlock.height : this.lastBlockHeight;
    var targetHeight = undefined === height ? this.lastBlockHeight : height;
    this.log.trace("BEGIN rollbackBlock ( height : " + currentHeight + " -> " + targetHeight + " )");
    this.preRollbackBlock(currentHeight, targetHeight);
    try {
      await this.blockSession.rollbackChanges(targetHeight);
      for (; this.lastBlockHeight > targetHeight;) {
        // await this.blockDB.deleteLastBlock(this.lastBlockHeight);
        this.cachedBlocks.evitUntil(this.lastBlockHeight);
      }
      await this.ensureLastBlockLoaded();
      /** @type {null} */
      this.currentBlock = null;
      this.postRollbackBlock(currentHeight, targetHeight);

      this.log.info("SUCCESS rollbackBlock ( height : " + currentHeight + " -> " + targetHeight + " )");
    } catch (errorExpectedCommand) {
      throw this.log.error("FAILD rollbackBlock ( height : " + currentHeight + " -> " + targetHeight + " )", errorExpectedCommand), errorExpectedCommand;
    }
  }

  create(model, entity) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("entity", function() {
      return CodeContract.notNull(entity);
    });
    var context = this.getSchema(model, true, true);
    return this.getSession().create(context, entity);
  }

  createOrLoad(model, entity) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("entity", function() {
      return CodeContract.notNull(entity);
    });
    var promise = this.getSchema(model, true, true);
    var result = this.loadSync(model, promise.getNormalizedPrimaryKey(entity));
    return {
      create : undefined === result,
      entity : result || this.create(model, entity)
    };
  }

  increase(model, obj, key) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("increasements", function() {
      return CodeContract.notNull(obj);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(key);
    });
    var sessionId = this.getSchema(model, true, true);
    return this.getSession().increase(sessionId, key, obj);
  }

  update(model, value, record) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("modifier", function() {
      return CodeContract.notNull(value);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(record);
    });
    var config = this.getSchema(model, true, true);
    if (true === this.options.checkModifier) {
      var type;
      /** @type {!Array<string>} */
      var values = Object.keys(value);
      var train1or = _.without(values, ...config.properties);
      if (train1or.length > 0) {
        throw new Error("modifier or entity contains property which is not defined in model (" + JSON.stringify(train1or) + ")");
      }
    }
    this.getSession().update(config, record, value);
  }

  del(model, condition) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(condition);
    });
    var url = this.getSchema(model, true, true);
    this.getSession().delete(url, condition);
  }
  async load(model, condition) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(condition);
    });
    var schema = this.getSchema(model, true);
    return await this.getSession().load(schema, condition);
  }

  loadSync(key, value) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(key);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(value);
    });
    var request = this.getSchema(key, true);
    return this.getSession().loadSync(request, value);
  }

  async loadMany(record, strategy) {
    var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    CodeContract.argument("model", function() {
      return CodeContract.notNull(record);
    });
    var options = this.getSchema(record, true);
    return await this.getSession().getMany(options, strategy, callback);
  }

  get(model, key) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(key);
    });
    var promise = this.getSchema(model, true);
    return this.getSession().getCachedEntity(promise, key);
  }

  getAll(model, callback) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    var query = this.getSchema(model, true);
    return CodeContract.argument("model", query.memCached, "getAll only support for memory model"), this.getSession().getAll(query, callback);
  }

  async find(record, data, args, user, callback, pageSize) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(record);
    });
    var url = this.getSchema(record, true);
    return await this.getSession().query(url, data, args, user, callback, pageSize);
  }

  async findOne(model, condition) {
    var expRecords = await this.findAll(model, condition);
    var schema = this.getSchema(model, true);
    if (expRecords.length > 1) {
      throw new Error("many entities found ( model = '" + schema.modelName + "' , params = '" + JSON.stringify(condition) + "' )");
    }
    return 0 === expRecords.length ? undefined : expRecords[0];
  }

  async findAll(model, condition) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    var sessionId = this.getSchema(model, true);
    return await this.getSession().queryByJson(sessionId, condition);
  }

  async exists(key, val) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(key);
    });
    const file = this.getSchema(key, true);
    return await this.getSession().exists(file, val);
  }


  async count(key, callback) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(key);
    });
    var url = this.getSchema(key, true);
    return await this.getSession().count(url, callback);
  }

  async loadMaxBlockHeight() {
    const height = await this.blockSession.getMaxBlockHeight();
    this._lastBlockHeight = height;
  }

  async ensureLastBlockLoaded() {
    if (undefined === this.lastBlock && this.lastBlockHeight >= 0) {
      var loadedBlock = await this.getBlockByHeight(this.lastBlockHeight, true);
      this.log.info("SUCCESS load last block (height = " + loadedBlock.height + ", id = '" + loadedBlock.id + "')");
      this.cachedBlocks.push(loadedBlock);
    }
  }

  async getBlockByHeight(height) {
    var withTransactions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    CodeContract.argument("height", height >= 0, "height must great or equal zero");
    var cachedBlock = this.copyCachedBlock(() => {
      return this.cachedBlocks.get(height);
    }, withTransactions);
    if (cachedBlock) {
      return cachedBlock;
    }
    var block = await this.blockSession.getBlockByHeight(height);
    if (block) {
      delete block._version_;
    }
    if (!withTransactions || undefined === block) {
      return block;
    }
    return await this.attachTransactions([block]);
  }


  async getBlockById(parentId) {
    var withTransactions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    CodeContract.argument("blockId", function() {
      return CodeContract.notNullOrWhitespace(parentId);
    });
    var cachedBlock = this.copyCachedBlock(() => {
      return this.cachedBlocks.getById(parentId);
    }, withTransactions);
    if (cachedBlock) {
      delete cachedBlock._version_;
      return cachedBlock;
    }
    var block = await this.blockSession.getBlockById(parentId);
    if (block) {
      delete block._version_;
    }

    if (!withTransactions || undefined === block) {
      return block;
    }
    return await this.attachTransactions([block]);
  }

  async getBlocksByHeightRange(min, max) {
    var withTransactions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    CodeContract.argument("minHeight, maxHeight", min >= 0 && max >= min, "minHeight or maxHeight is invalid");
    // var off = await this.blockDB.getBlocksByHeightRange(min, max);
    var result = await this.blockSession.getBlocksByHeightRange(min, max);
    if (result) {
      result.forEach((item) => {
        delete item._version_;
      });
    }
    if (withTransactions) {
      return await this.attachTransactions(result);
    } else {
      return result;
    }
  }

  async getBlocksByIds(blockIds) {
    var withTransactions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    CodeContract.argument("blockIds", function() {
      return CodeContract.notNull(blockIds);
    });
    const result = [];
    for (let i = 0; i < result.length; ++i) {
      const id  = blockIds[i];
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

  async attachTransactions(blocks) {
    // TODO: make only one database call
    for (let i = 0; i < blocks.length; ++i) {
      const trans = await this.blockSession.getTransactionsByBlockHeight(blocks[i].height);
      blocks[i].transactions = trans || [];
    }
    return blocks;
  }

  copyCachedBlock(task, packageJson) {
    var result = task();
    if (undefined === result) {
      return;
    }
    var key = Object.assign({}, result);
    return packageJson || Reflect.deleteProperty(key, "transactions"), key;
  }

  get transactionSchema() {
    return this.getSchema(SmartDB.TRANSACTION_MODEL_NAME, true, true);
  }

  get lastBlockHeight() {
    // return this.blockDB.lastBlockHeight;
    return this._lastBlockHeight;
  }

  get blocksCount() {
    return this.lastBlockHeight + 1;
  }

  get lastBlock() {
    return this.cachedBlocks.get(this.lastBlockHeight);
  }
}
