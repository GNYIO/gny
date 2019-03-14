const { EventEmitter } = require('events');
const { isString } = require('util');
const { CodeContract } = require('./codeContract');
const { DbSession } = require('./dbSession');
const { SqliteConnection } = require('./sqliteConnection');
const { LogManager } = require('./logger');
const { BlockCache } = require('./blockCache');
const performance = require('./performance');
const _ = require('lodash');

class SmartDB extends EventEmitter {
  /**
   * @param {!Storage} dbPath
   * @param {!Object} options
   * @return {?}
   */
  constructor(dbPath, options) {
    super();
    CodeContract.argument("dbPath", function() {
      return CodeContract.notNullOrWhitespace(dbPath);
    });
    this.options = options || {
      cachedBlockCount : 10,
      maxBlockHistoryHold : 10
    };
    this.commitBlockHooks = [];
    this.rollbackBlockHooks = [];
    this.schemas = new Map;
    this.log = LogManager.getLogger("SmartDB");
    this.cachedBlocks = new BlockCache(this.options.cachedBlockCount);
    this.connection = new SqliteConnection({
      storage : dbPath
    });

    // TODO: fix loadHistoryFromLevelDB
    this.blockSession = new DbSession(this.connection, new Map(), {
      name : "Block"
    });

    this._lastBlockHeight = undefined;
  }

  getSchema(obj) { // private, obj = model
    var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var o = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var id = isString(obj) ? String(obj) : obj.name;
    var modelSchema = this.schemas.get(id);
    
    t && CodeContract.verify(undefined !== modelSchema, "unregistered model '" + id + "'");
    o && CodeContract.verify(!modelSchema.isReadonly, "model '" + id + "' is readonly");
    return modelSchema;
  }

  // async loadHistroyFromLevelDB(e, exceptionLevel) {
  //   return await this.blockDB.getHistoryChanges(e, exceptionLevel);
  // }

  getSession(s) { // private
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

  async init(schemas) {
    CodeContract.argument("schemas", function() {
      return CodeContract.notNull(schemas);
    });
    await this.connection.connect();
    await this.syncSchemas(schemas);

    await this.loadMaxBlockHeight();
    await this.ensureLastBlockLoaded();

    await this.blockSession.initSerial(this.lastBlockHeight);

    this.emit("ready", this);
  }

  async syncSchemas(pars) {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;
    try {
      var _iterator3 = pars[Symbol.iterator]();
      var _step6;
      for (; !(_iteratorNormalCompletion3 = (_step6 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var key = _step6.value;
        this.schemas.set(key.modelName, key);
        var data = this.getSession(key);
        if (data.registerSchema(key), data.syncSchema(key), this.log.info("sync schema model = " + key.modelName + " "), key.memCached) {
          var expRecords = await data.getMany(key, {}, true);
          this.log.info("model " + key.modelName + " cached " + expRecords.length + " entities ");
        }
      }
    } catch (err) {
      _didIteratorError6 = true;
      _iteratorError6 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError6) {
          throw _iteratorError6;
        }
      }
    }
    if (undefined === this.transactionSchema) {
      throw new Error("Transaction model is not found");
    }
  }

  async updateSchema(schema) {
    CodeContract.argument("schema", function() {
      return CodeContract.notNull(schema);
    });
    var sessionId = this.getSchema(schema.modelName);
    var session = this.getSession(sessionId);
    await session.updateSchema(schema);
    this.log.info("model " + schema.modelName + " schema updated ");
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
    return this.getSession(context).create(context, entity);
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
    return this.getSession(sessionId).increase(sessionId, key, obj);
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
    this.getSession(config).update(config, record, value);
  }

  del(model, condition) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(condition);
    });
    var url = this.getSchema(model, true, true);
    this.getSession(url).delete(url, condition);
  }
  async load(model, condition) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(condition);
    });
    var schema = this.getSchema(model, true);
    return await this.getSession(schema).load(schema, condition);
  }

  loadSync(key, value) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(key);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(value);
    });
    var request = this.getSchema(key, true);
    return this.getSession(request).loadSync(request, value);
  }

  async loadMany(record, strategy) {
    var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    CodeContract.argument("model", function() {
      return CodeContract.notNull(record);
    });
    var options = this.getSchema(record, true);
    return await this.getSession(options).getMany(options, strategy, callback);
  }

  get(model, key) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    CodeContract.argument("key", function() {
      return CodeContract.notNull(key);
    });
    var promise = this.getSchema(model, true);
    return this.getSession(promise).getCachedEntity(promise, key);
  }

  getAll(model, callback) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(model);
    });
    var query = this.getSchema(model, true);
    return CodeContract.argument("model", query.memCached, "getAll only support for memory model"), this.getSession(query).getAll(query, callback);
  }

  async find(record, data, args, user, callback, pageSize) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(record);
    });
    var url = this.getSchema(record, true);
    return await this.getSession(url).query(url, data, args, user, callback, pageSize);
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
    return await this.getSession(sessionId).queryByJson(sessionId, condition);
  }

  async exists(key, val) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(key);
    });
    var file = this.getSchema(key, true);
    return await this.getSession(file).exists(file, val);
  }


  async count(key, callback) {
    CodeContract.argument("model", function() {
      return CodeContract.notNull(key);
    });
    var url = this.getSchema(key, true);
    return await this.getSession(url).count(url, callback);
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

SmartDB.TRANSACTION_MODEL_NAME = "Transaction";

module.exports = {
  SmartDB,
}
