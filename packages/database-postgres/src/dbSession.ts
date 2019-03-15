import { LogManager } from './logger';
import { isArray } from 'util';
import { LRUEntityCache } from './lruEntityCache';
import * as _fieldTypes from './fieldTypes';
import * as _jsonSqlBuilder from './jsonSQLBuilder';
import * as codeContract from './codeContract';
import { BasicTrackerSqlBuilder } from './basicTrackerSqlBuilder';
import { BasicEntityTracker } from './basicEntityTracker';
import * as performance from './performance';
import { toArray } from './helpers/index';

export class DbSession {

  public DEFAULT_HISTORY_VERSION_HOLD = 10;

  /**
   * @param {!Object} connection
   * @param {?} historyChanges
   * @param {?} f
   * @return {undefined}
   */
  constructor(connection, historyChanges, f) {
    /** @type {!Object} */
    var key = Object.assign({}, f);
    var i = key.name;
    this.log = LogManager.getLogger('DbSession' + (undefined === i ? "" : "_" + i));
    /** @type {number} */
    this.sessionSerial = -1;
    /** @type {!Object} */
    this.connection = connection;
    /** @type {!Set} */
    this.unconfirmedLocks = new Set;
    /** @type {!Set} */
    this.confirmedLocks = new Set;
    /** @type {!Map} */
    this.schemas = new Map;
    this.sessionCache = new LRUEntityCache(this.schemas);
    this.sqlBuilder = new _jsonSqlBuilder.JsonSqlBuilder;
    var message = key.maxHistoryVersionsHold || DbSession.DEFAULT_HISTORY_VERSION_HOLD;

    this.entityTracker = new BasicEntityTracker(this.sessionCache, this.schemas, message, LogManager.getLogger('BasicEntityTracker'), historyChanges);
    this.trackerSqlBuilder = new BasicTrackerSqlBuilder(this.entityTracker, this.schemas, this.sqlBuilder);
  }

  makeByKeyCondition(table, key) {
    return table.resolveKey(key).key;
  }

  trackPersistentEntities(data, remove) {
    var props = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    /** @type {!Array} */
    var list = new Array;
    remove.forEach((val) => {
      var end = data.getPrimaryKey(val);
      var height = this.entityTracker.getTrackingEntity(data, end);
      var param = props && undefined !== height ? height : this.entityTracker.trackPersistent(data, val);
      list.push(data.copyProperties(param, true));
    });
    return list;
  }

  reset() {
    var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    if (e) {
      this.sessionCache.clear();
    }
  }


  undefinedIfDeleted(v) {
    return codeContract.deepCopy(v);
  }


  async queryEntities(schema, queryObject) {
    var i = await this.connection.query(queryObject.query, queryObject.parameters);
    return this.replaceEntitiesJsonPropertis(schema, i);
  }


  queryEntitiesSync(expr, options) {
    var i = this.connection.querySync(options.query, options.parameters);
    return this.replaceEntitiesJsonPropertis(expr, i);
  }


  syncSchema(e) {
    this.sqlBuilder.buildSchema(e).forEach((sync) => {
      this.connection.executeSync(sync);
    });
  }

  async updateSchema(val) {
    if (await this.exists(val, {})) {
      throw new Error("Can not update schema(" + val.modelName + ") because table is not empty");
    }
    var query = this.sqlBuilder.buildDropSchema(val);
    await this.connection.execute(query);
    this.syncSchema(val);
    this.registerSchema(val);
  }

  registerSchema() {
    /** @type {number} */
    var _len8 = arguments.length;
    /** @type {!Array} */
    var storeNames = Array(_len8);
    /** @type {number} */
    var _key8 = 0;
    for (; _key8 < _len8; _key8++) {
      storeNames[_key8] = arguments[_key8];
    }
    storeNames.forEach((metadata) => {
      this.schemas.set(metadata.modelName, metadata);
    });
  }


  async initSerial(conid) {
    this.sessionSerial = conid;
    var self = this.entityTracker;
    if (conid >= 0) {
      await self.initVersion(conid);
    }
  }


  async close() {
    this.reset(true);
    await this.connection.disconnect();
  }


  getAll(d, t) {
    if (!d.memCached) {
      throw new Error("getAll only support in memory model");
    }
    /**
     * @param {?} n
     * @return {?}
     */
    var color = (n) => {
      return undefined !== this.undefinedIfDeleted(n);
    };
    /** @type {function(?): ?} */
    var c = t ? function(s) {
      return t(s) && color(s);
    } : color;
    return this.sessionCache.getAll(d.modelName, c);
  }

  loadAll(context) {
    if (context.memCached && this.sessionCache.existsModel(context.modelName)) {
      var artistTrack = this.sessionCache.getAll(context.modelName) || [];
      return this.trackPersistentEntities(context, artistTrack, true);
    }
    return [];
  }

  async getMany(data, s) {
    var _nodeMustDisplay = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    var options = this.sqlBuilder.buildSelect(data, data.properties, s);
    var _animateProperties = await this.queryEntities(data, options);
    return _nodeMustDisplay ? this.trackPersistentEntities(data, _animateProperties, true) : _animateProperties;
  }

  async query (component, options, width, height, props, styleObject) {
    var a = this.sqlBuilder.buildSelect(component, props || component.properties, options, width, height, styleObject);
    return await this.queryEntities(component, a);
  }

  async queryByJson(data, column) {
    var type = this.sqlBuilder.buildSelect(data, column);
    return await this.queryEntities(data, type);
  }

  async exists(data, options) {
    var request = this.sqlBuilder.buildSelect(data, [], options);
    var q = request.query;
    var params = request.parameters;
    /** @type {string} */
    q = "select exists(" + q.replace(_jsonSqlBuilder.MULTI_SQL_SEPARATOR, "") + ") as exist";
    var result = await this.connection.query(q, params);
    return isArray(result) && parseInt(result[0].exist) > 0;
  }

  async count(newLabels, data) {
    var range = await this.queryByJson(newLabels, {
      fields : "count(*) as count",
      condition : data
    });
    return isArray(range) ? parseInt(range[0].count) : 0;
  }

  create(schema, modelObj) {
    var mapData = schema.getNormalizedPrimaryKey(modelObj);
    if (undefined === mapData) {
      throw new Error("entity must contains primary key ( model = '" + schema.modelName + "' entity = '" + modelObj + "' )");
    }
    if (this.sessionCache.exists(schema.modelName, mapData)) {
      throw new Error("entity exists already ( model = '" + schema.modelName + "' key = '" + JSON.stringify(mapData) + "' )");
    }
    return codeContract.deepCopy(this.entityTracker.trackNew(schema, modelObj));
  }

  loadEntityByKeySync(data, version) {
    var results = this.makeByKeyCondition(data, version);
    var options = this.sqlBuilder.buildSelect(data, data.properties, results);
    var dataPerSeries = this.queryEntitiesSync(data, options);
    if (dataPerSeries.length > 1) {
      throw new Error("entity key is duplicated ( model = '" + data.modelName + "' key = '" + JSON.stringify(version) + "' )");
    }
    return 1 === dataPerSeries.length ? dataPerSeries[0] : undefined;
  }

  async loadEntityByKey(data, key) {
    var params = this.makeByKeyCondition(data, key);
    var options = this.sqlBuilder.buildSelect(data, data.properties, params);
    var expRecords = await this.queryEntities(data, options);
    if (expRecords.length > 1) {
      throw new Error("entity key is duplicated ( model = '" + data.modelName + "' key = '" + JSON.stringify(key) + "' )");
    }
    return 1 === expRecords.length ? expRecords[0] : undefined;
  }

  replaceJsonProperties(value, args) {
    if (0 === value.jsonProperties.length) {
      return args;
    }
    /** @type {!Object} */
    var inner = Object.assign({}, args);
    value.jsonProperties.forEach(function(key) {
      if (Reflect.has(inner, key)) {
        /** @type {*} */
        inner[key] = JSON.parse(String(args[key]));
      }
    })
    return inner;
  }

  replaceEntitiesJsonPropertis(updated, recorded) {
    return 0 === updated.jsonProperties.length ? recorded : recorded.map((whilstNext) => {
      return this.replaceJsonProperties(updated, whilstNext);
    });
  }
  async load(schema, key) {
    var threads_element = this.getCachedEntity(schema, key);
    if (undefined !== threads_element) {
      return threads_element;
    }
    var keyReads = await this.loadEntityByKey(schema, key);
    if (undefined === keyReads) {
      return;
    }
    var data = this.entityTracker.trackPersistent(schema, keyReads);
    return schema.copyProperties(data, true);
  }

  loadSync(self, key) {
    var currentDescriptor = this.getCachedEntity(self, key);
    if (undefined !== currentDescriptor) {
      return currentDescriptor;
    }
    var value = this.loadEntityByKeySync(self, key);
    if (undefined === value) {
      return;
    }
    var data = this.entityTracker.trackPersistent(self, value);
    return self.copyProperties(data, true);
  }

  getChanges() {
    return this.entityTracker.getConfimedChanges();
  }

  normalizeEntityKey(table, key) {
    var exists = table.resolveKey(key);
    if (undefined === exists) {
      throw new _fieldTypes.InvalidEntityKeyError(table.modelName, key);
    }
    return exists;
  }

  getCached(e, mode) {
    var result = this.normalizeEntityKey(e, mode);
    var this_area = this.entityTracker.getTrackingEntity(e, result.key);
    // TODO: refactor return
    return this_area || (result.isPrimaryKey ? this.sessionCache.get(e.modelName, result.key) : this.sessionCache.getUnique(e.modelName, result.uniqueName, result.key));
  }

  getTrackingOrCachedEntity(url, id) {
    var cached = this.getCached(url, id);
    return undefined === cached ? undefined : this.undefinedIfDeleted(cached);
  }

  getCachedEntity(url, id) {
    var cached = this.getCached(url, id);
    return undefined === cached ? undefined : this.undefinedIfDeleted(cached);
  }

  clearLocks() {
    this.unconfirmedLocks.clear();
    this.confirmedLocks.clear();
  }

  confirmLocks() {
    this.unconfirmedLocks.forEach((e) => {
      return this.confirmedLocks.add(e);
    });
  }

  lockInThisSession(part) {
    var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    if (!(this.confirmedLocks.has(part) || this.unconfirmedLocks.has(part))) {
      // check logic
      (this.entityTracker.isConfirming ? this.unconfirmedLocks : this.confirmedLocks).add(part);
      this.log.trace("SUCCESS lock name = '" + part + "'");
      return true;
    }
    // TODO check
    if (this.log.warn("FAILD lock " + part), !t) {
      throw new Error("Lock name = " + part + " exists already");
    }
    return false;
  }

  async saveChanges(height) {
    var withArgs_ = height || ++this.sessionSerial;
    this.log.trace("BEGIN saveChanges ( serial = " + withArgs_ + " )");

    this.commitEntityTransaction();
    performance.Utils.Performace.time("Build sqls");
    var value = this.trackerSqlBuilder.buildChangeSqls();
    performance.Utils.Performace.restartTime("Execute sqls (" + value.length + ")");
    var trans = await this.connection.beginTrans();
    try {
      await this.connection.executeBatch(value);
      await trans.commit();
      performance.Utils.Performace.restartTime("Accept changes");
      this.entityTracker.acceptChanges(withArgs_);
      performance.Utils.Performace.endTime();
      this.clearLocks();
      this.sessionSerial = withArgs_;
      this.log.trace("SUCCESS saveChanges ( serial = " + withArgs_ + " )");
      return withArgs_;
    } catch (expectedCommand) {
       this.log.error("FAILD saveChanges ( serial = " + withArgs_ + " )", expectedCommand);
       await trans.rollback();
       this.entityTracker.rejectChanges();
       throw expectedCommand;
    }
  }

  async rollbackChanges(allOrId) {
    if (this.sessionSerial < allOrId) {
      return this.sessionSerial;
    }
    var t = this.sessionSerial;

    this.log.trace("BEGIN rollbackChanges ( serial = " + allOrId + " )");
    var sysupgradeCommand = await this.trackerSqlBuilder.buildRollbackChangeSqls(allOrId + 1);
    var transaction = await this.connection.beginTrans();
    try {
       await this.connection.executeBatch(sysupgradeCommand);
       await transaction.commit();
       this.entityTracker.rejectChanges();
       await this.entityTracker.rollbackChanges(allOrId + 1);
       this.clearLocks();
       this.sessionSerial = allOrId;
       this.log.trace("SUCCESS rollbackChanges (serial : " + t + " -> " + this.sessionSerial + ")");
       return this.sessionSerial;
    } catch (expectedCommand) {
       this.log.error("FAILD rollbackChanges (serial : " + t + " -> " + this.sessionSerial + ")", expectedCommand);
       await transaction.rollback();
       throw expectedCommand;
    }
  }

  ensureEntityTracking(model, id) {
    var promise = this.getCached(model, id);
    if (undefined === promise) {
      var data = this.loadEntityByKeySync(model, id);
      if (undefined === data) {
        throw Error("Entity not found ( model = '" + model.modelName + "', key = '" + JSON.stringify(id) + "' )");
      }
      promise = this.entityTracker.trackPersistent(model, data);
    }
    return promise;
  }

  update(e, label, exception) {
    var x = this.ensureEntityTracking(e, label);
    this.entityTracker.trackModify(e, x, exception);
  }

  increase(schema, keyObj, obj) {
    var end = this.ensureEntityTracking(schema, keyObj);
    var endColorCoords = {};
    Object.keys(obj).forEach(function(i) {
      endColorCoords[i] = undefined === end[i] ? obj[i] : obj[i] + end[i];
    });
    this.entityTracker.trackModify(schema, end, endColorCoords);
    return endColorCoords;
  }

  delete(e, exceptionLevel) {
    var parsed_expression = this.ensureEntityTracking(e, exceptionLevel);
    this.entityTracker.trackDelete(e, parsed_expression);
  }

  async beginTransaction() {
    return await this.connection.beginTrans();
  }

  beginEntityTransaction() {
    this.entityTracker.beginConfirm();
  }

  commitEntityTransaction() {
    this.entityTracker.confirm();

    this.log.trace("commit locks " + DbSession.setToString(this.unconfirmedLocks));
    this.unconfirmedLocks.forEach((e) => {
      return this.confirmedLocks.add(e);
    });
  }

  rollbackEntityTransaction() {
    this.entityTracker.cancelConfirm();
    this.log.trace("rollback locks " + DbSession.setToString(this.unconfirmedLocks));
    this.unconfirmedLocks.clear();
  }

  /**
   * @returns -1 -> (no blocks); 0 -> genesisBlock; 1... -> normal blocks
   */
  async getMaxBlockHeight() {
    const result = await this.connection.query('select max(height) as maxHeight from blocks;');
    const value = result[0].maxHeight;

    if (value === undefined || value == null) {
      return -1;
    } else {
      return value;
    }
  }

  async getBlockByHeight(height) {
    // TODO: remove possible SQL injection
    const result = await this.connection.query(`select * from blocks where height = ${height}`);
    return result[0];
  }

  async getBlockById(id) {
    // TODO: remove possible SQL injection
    const result = await this.connection.query(`select * from blocks where id = '${id}'`);
    return result[0];
  }

  getBlocksByHeightRange(min, max) {
    const blocks = this.connection.query(`select * from blocks where height >= ${min} AND height <= ${max}`);
    return blocks;
  }

  async getTransactionsByBlockHeight(height) {
    // TODO: remove possible SQL injection
    const trans = await this.connection.query(`select * from transactions where height = ${height}`);
    return trans;
  }

  get isOpen() {
    return this.connection && this.connection.isConnected;
  }

  static setToString(orderedBranch) {
    return JSON.stringify(new (Function.prototype.bind.apply(Array, [null].concat(toArray(orderedBranch.keys())))));
  }
}


