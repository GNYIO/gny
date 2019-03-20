import { LogManager, LoggerWrapper } from './logger';
import { isArray } from 'util';
import { LRUEntityCache } from './lruEntityCache';
import { InvalidEntityKeyError } from './fieldTypes';
import * as _jsonSqlBuilder from './jsonSQLBuilder';
import * as codeContract from './codeContract';
import { BasicTrackerSqlBuilder } from './basicTrackerSqlBuilder';
import { BasicEntityTracker } from './basicEntityTracker';
import * as performance from './performance';
import { toArray, resolveKey, loadSchemas } from './helpers/index';
import { Connection } from 'typeorm';


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
import { ModelSchema } from './modelSchema';


export class DbSession {

  public static readonly DEFAULT_HISTORY_VERSION_HOLD = 10;

  private log: LoggerWrapper;
  private sessionSerial: number;
  private connection: Connection;
  private unconfirmedLocks: Set<any>;
  private confirmedLocks: Set<any>;
  private schemas: Map<string, ModelSchema>;
  private sessionCache: LRUEntityCache;
  private sqlBuilder: _jsonSqlBuilder.JsonSqlBuilder;
  private entityTracker: BasicEntityTracker;
  private trackerSqlBuilder: BasicTrackerSqlBuilder;


  constructor(connection: Connection, historyChanges, maxHistoryVersionsHold?: number) {
    this.log = LogManager.getLogger('DbSession');
    this.sessionSerial = -1;
    this.connection = connection;
    this.unconfirmedLocks = new Set;
    this.confirmedLocks = new Set;
    this.schemas = loadSchemas();
    this.sessionCache = new LRUEntityCache(this.schemas);
    this.sqlBuilder = new _jsonSqlBuilder.JsonSqlBuilder;
    const howManyVersionsToHold = maxHistoryVersionsHold || DbSession.DEFAULT_HISTORY_VERSION_HOLD;

    this.entityTracker = new BasicEntityTracker(this.sessionCache, this.schemas, howManyVersionsToHold, LogManager.getLogger('BasicEntityTracker'), historyChanges);
    this.trackerSqlBuilder = new BasicTrackerSqlBuilder(this.entityTracker, this.schemas, this.sqlBuilder);
  }

  makeByKeyCondition(table, key) {
    return resolveKey(table, key).key;
  }

  trackPersistentEntities(data: ModelSchema, remove) {
    const props = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    const list = new Array;
    remove.forEach((val) => {
      var end = data.getPrimaryKey(val);
      var height = this.entityTracker.getTrackingEntity(data, end);
      var param = props && undefined !== height ? height : this.entityTracker.trackPersistent(data, val);
      list.push(data.copyProperties(param, true));
    });
    return list;
  }

  reset() {
    const e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
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

  async initSerial(serial: number) {
    this.sessionSerial = serial;
    if (serial >= 0) {
      await this.entityTracker.initVersion(serial);
    }
  }

  async close() {
    this.reset(true);
    await this.connection.disconnect();
  }


  getAll(modelClass: ModelSchema) {
    if (!modelClass.memCached) {
      throw new Error('getAll only support in memory model');
    }

    return this.sessionCache.getAll(modelClass.modelName);
  }

  loadAll(schema: ModelSchema) {
    if (schema.memCached && this.sessionCache.existsModel(schema.modelName)) {
      const artistTrack = this.sessionCache.getAll(schema.modelName) || [];
      return this.trackPersistentEntities(schema, artistTrack, true);
    }
    return [];
  }

  async getMany(data, s) { // TODO, refactor
    var _nodeMustDisplay = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    var options = this.sqlBuilder.buildSelect(data, data.properties, s);
    var _animateProperties = await this.queryEntities(data, options);
    return _nodeMustDisplay ? this.trackPersistentEntities(data, _animateProperties, true) : _animateProperties;
  }

  async query (component, options, width, height, props, styleObject) {
    const a = this.sqlBuilder.buildSelect(component, props || component.properties, options, width, height, styleObject);
    return await this.queryEntities(component, a);
  }

  async queryByJson(data, column) {
    var type = this.sqlBuilder.buildSelect(data, column);
    return await this.queryEntities(data, type);
  }

  async exists(modelClass, whereClause) {
    // look at the In operator, think of something other differentf
    let queryBuilder = this.connection.createQueryBuilder()
      .select('x')
      .from(modelClass, 'x');

    const whereKeys = Object.keys(whereClause);
    if (whereKeys.length > 1) {
      throw new Error('only one property is allowed on WHERE clause');
    }

    const propName = whereKeys[0];
    const propValue = whereClause[propName];
    if (Array.isArray(propValue)) {
      queryBuilder = queryBuilder.where(`x.${propName} IN (:...${propName})`, whereClause);
    } else {
      queryBuilder = queryBuilder.where(`x.${propName} = :${propName}`, whereClause);
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async count(newLabels, data) {
    var range = await this.queryByJson(newLabels, {
      fields : "count(*) as count",
      condition : data
    });
    return isArray(range) ? parseInt(range[0].count) : 0;
  }

  create(schema: ModelSchema, modelObj) {
    const mapData = schema.getNormalizedPrimaryKey(modelObj);
    if (undefined === mapData) {
      throw new Error("entity must contains primary key ( model = '" + schema.modelName + "' entity = '" + modelObj + "' )");
    }
    if (this.sessionCache.exists(schema.modelName, mapData)) {
      throw new Error("entity exists already ( model = '" + schema.modelName + "' key = '" + JSON.stringify(mapData) + "' )");
    }
    return codeContract.deepCopy(this.entityTracker.trackNew(schema, modelObj));
  }

  loadEntityByKeySync(schema: ModelSchema, version) {
    const results = this.makeByKeyCondition(schema, version);
    const options = this.sqlBuilder.buildSelect(schema, schema.properties, results);
    const dataPerSeries = this.queryEntitiesSync(schema, options);
    if (dataPerSeries.length > 1) {
      throw new Error("entity key is duplicated ( model = '" + schema.modelName + "' key = '" + JSON.stringify(version) + "' )");
    }
    return 1 === dataPerSeries.length ? dataPerSeries[0] : undefined;
  }

  async loadEntityByKey(schema: ModelSchema, key) {
    const params = this.makeByKeyCondition(schema, key);
    const options = this.sqlBuilder.buildSelect(schema, schema.properties, params);
    const expRecords = await this.queryEntities(schema, options);
    if (expRecords.length > 1) {
      throw new Error("entity key is duplicated ( model = '" + schema.modelName + "' key = '" + JSON.stringify(key) + "' )");
    }
    return 1 === expRecords.length ? expRecords[0] : undefined;
  }

  replaceJsonProperties(value: ModelSchema, args) {
    if (0 === value.jsonProperties.length) {
      return args;
    }
    const inner = Object.assign({}, args);
    value.jsonProperties.forEach(function(key) {
      if (Reflect.has(inner, key)) {
        inner[key] = JSON.parse(String(args[key])); // deepCopy
      }
    });
    return inner;
  }

  replaceEntitiesJsonPropertis(updated: ModelSchema, recorded) {
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

  normalizeEntityKey(table, key /* id | { id }?? */) { // { address: "afebefe" }
    const result = resolveKey(table, key);
    return result;
  }

  // isPrimaryKey:true
  // key:Object {address: "G3VU8VKndrpzDVbKzNTExoBrDAnw5"}
  // uniqueName:"__PrimaryKey__"

  getCached(schema: ModelSchema, keyvalue) {
    const primaryKeyMetadata = this.normalizeEntityKey(schema, keyvalue); // isPrimaryKey: true, key: { address: "" }, uniqueName: "__PrimaryKey__"
    const this_area = this.entityTracker.getTrackingEntity(schema, primaryKeyMetadata.key);

    // TODO: refactor return
    return this_area || (primaryKeyMetadata.isPrimaryKey ? this.sessionCache.get(schema.modelName, primaryKeyMetadata.key) : this.sessionCache.getUnique(schema.modelName, primaryKeyMetadata.uniqueName, primaryKeyMetadata.key));
  }

  getTrackingOrCachedEntity(url, id) {
    var cached = this.getCached(url, id);
    return undefined === cached ? undefined : this.undefinedIfDeleted(cached);
  }

  getCachedEntity(schema, key) {
    const cached = this.getCached(schema, key);
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

  ensureEntityTracking(schema: ModelSchema, id) {
    let promise = this.getCached(schema, id);
    if (undefined === promise) {
      var data = this.loadEntityByKeySync(schema, id);
      if (undefined === data) {
        throw Error("Entity not found ( model = '" + schema.modelName + "', key = '" + JSON.stringify(id) + "' )");
      }
      promise = this.entityTracker.trackPersistent(schema, data);
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
    const result = await this.connection.query('select max(height) as maxheight from block;');
    const value = result[0].maxheight;

    if (value === undefined || value == null) {
      return -1;
    } else {
      return Number(value);
    }
  }

  async getBlockByHeight(height) { // TODO, add overload that also loads transactions
    const result = await this.connection.createQueryBuilder()
      .select('b')
      .from(Block, 'b')
      .where('b.height = :height', { height })
      .getOne();
    return result;
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
    const trans = await this.connection.createQueryBuilder()
      .select('t')
      .from(Transaction, 't')
      .where('t.heightHeight = :height', { height: Number(height) })
      .getSql(); // .getMany();
    return trans;
  }

  get isOpen() {
    return this.connection && this.connection.isConnected;
  }

  static setToString(orderedBranch) {
    return JSON.stringify(new (Function.prototype.bind.apply(Array, [null].concat(toArray(orderedBranch.keys())))));
  }
}
