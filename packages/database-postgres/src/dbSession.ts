import { LogManager, LoggerWrapper } from './logger';
import { isArray } from 'util';
import { LRUEntityCache } from './lruEntityCache';
import * as _jsonSqlBuilder from './jsonSQLBuilder';
import * as codeContract from './codeContract';
import { BasicTrackerSqlBuilder } from './basicTrackerSqlBuilder';
import { BasicEntityTracker, LoadChangesHistoryAction } from './basicEntityTracker';
import * as performance from './performance';
import { Connection, ObjectLiteral } from 'typeorm';
import { ModelSchema } from './modelSchema';

import { Block } from '../entity/Block';
import { Transaction } from '../entity/Transaction';

export class DbSession {

  public static readonly DEFAULT_HISTORY_VERSION_HOLD = 10;

  private log: LoggerWrapper;
  private sessionSerial: number;
  private connection: Connection;
  private unconfirmedLocks: Set<string>;
  private confirmedLocks: Set<string>;
  private schemas: Map<string, ModelSchema>;
  private sessionCache: LRUEntityCache;
  private sqlBuilder: _jsonSqlBuilder.JsonSqlBuilder;
  private entityTracker: BasicEntityTracker;
  private trackerSqlBuilder: BasicTrackerSqlBuilder;


  constructor(connection: Connection, historyChanges: LoadChangesHistoryAction, schemas: Map<string, ModelSchema>, maxHistoryVersionsHold?: number) {
    this.log = LogManager.getLogger('DbSession');
    this.sessionSerial = -1;
    this.connection = connection;
    this.unconfirmedLocks = new Set<string>();
    this.confirmedLocks = new Set<string>();
    this.schemas = schemas;
    this.sessionCache = new LRUEntityCache(this.schemas);
    this.sqlBuilder = new _jsonSqlBuilder.JsonSqlBuilder;
    const howManyVersionsToHold = maxHistoryVersionsHold || DbSession.DEFAULT_HISTORY_VERSION_HOLD;

    this.entityTracker = new BasicEntityTracker(this.sessionCache, this.schemas, howManyVersionsToHold, LogManager.getLogger('BasicEntityTracker'), historyChanges);
    this.trackerSqlBuilder = new BasicTrackerSqlBuilder(this.entityTracker, this.schemas, this.sqlBuilder);
  }

  private makeByKeyCondition(schema: ModelSchema, key: ObjectLiteral) {
    return schema.resolveKey(key).key;
  }

  private trackPersistentEntities(schema: ModelSchema, remove, props = false) {
    const result = [];
    remove.forEach((val) => {
      const end = schema.getPrimaryKey(val);
      const height = this.entityTracker.getTrackingEntity(schema, end);
      const param = props && undefined !== height ? height : this.entityTracker.trackPersistent(schema, val);
      result.push(schema.copyProperties(param, true));
    });
    return result;
  }

  private reset(clearCache = false) {
    if (clearCache) {
      this.sessionCache.clear();
    }
  }

  private async queryEntities(schema: ModelSchema, queryObject) {
    const result = await this.connection.query(queryObject.query, queryObject.parameters);
    return this.replaceEntitiesJsonPropertis(schema, result);
  }

  // TODO: remove sync methods
  private queryEntitiesSync(expr, options) {
    const result = this.connection.querySync(options.query, options.parameters);
    return this.replaceEntitiesJsonPropertis(expr, result);
  }

  public async initSerial(serial: number) {
    this.sessionSerial = serial;
    if (serial >= 0) {
      await this.entityTracker.initVersion(serial);
    }
  }

  public async close() {
    this.reset(true);
    await this.connection.close();
  }

  public getAll(modelClass: ModelSchema) {
    if (!modelClass.memCached) {
      throw new Error('getAll only support in memory model');
    }

    return this.sessionCache.getAll(modelClass.modelName);
  }

  private loadAll(schema: ModelSchema) {
    if (schema.memCached && this.sessionCache.existsModel(schema.modelName)) {
      const artistTrack = this.sessionCache.getAll(schema.modelName) || [];
      return this.trackPersistentEntities(schema, artistTrack, true);
    }
    return [];
  }

  public async getMany(schema: ModelSchema, condition, cache = true) { // TODO, refactor
    const options = this.sqlBuilder.buildSelect(schema, schema.properties, condition);
    const result = await this.queryEntities(schema, options);
    return cache ? this.trackPersistentEntities(schema, result, true) : result;
  }

  public async query(schema: ModelSchema, condition, resultRange, sort, fields, join) {
    const a = this.sqlBuilder.buildSelect(schema, fields || schema.properties, condition, resultRange, sort, join);
    return await this.queryEntities(schema, a);
  }

  public async queryByJson(schema: ModelSchema, obj: ObjectLiteral) {
    const type = this.sqlBuilder.buildSelect(schema, obj);
    return await this.queryEntities(schema, type);
  }

  public async exists(schema: ModelSchema, condition: ObjectLiteral) {
    // look at the In operator, think of something other differentf
    let queryBuilder = this.connection.createQueryBuilder()
      .select('x')
      .from(schema.modelName, 'x');

    const whereKeys = Object.keys(condition);
    if (whereKeys.length > 1) {
      throw new Error('only one property is allowed on WHERE clause');
    }

    const propName = whereKeys[0];
    const propValue = condition[propName];
    if (Array.isArray(propValue)) {
      queryBuilder = queryBuilder.where(`x.${propName} IN (:...${propName})`, condition);
    } else {
      queryBuilder = queryBuilder.where(`x.${propName} = :${propName}`, condition);
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  public async count(schema: ModelSchema, condition: ObjectLiteral) {
    const range = await this.queryByJson(schema, {
      fields : 'count(*) as count',
      condition : condition
    });
    return isArray(range) ? parseInt(range[0].count) : 0;
  }

  public create(schema: ModelSchema, entity: ObjectLiteral) {
    const mapData = schema.getNormalizedPrimaryKey(entity);
    if (undefined === mapData) {
      throw new Error("entity must contains primary key ( model = '" + schema.modelName + "' entity = '" + entity + "' )");
    }
    if (this.sessionCache.exists(schema.modelName, mapData)) {
      throw new Error("entity exists already ( model = '" + schema.modelName + "' key = '" + JSON.stringify(mapData) + "' )");
    }
    return codeContract.deepCopy(this.entityTracker.trackNew(schema, entity));
  }

  private loadEntityByKeySync(schema: ModelSchema, obj: ObjectLiteral) {
    const results = this.makeByKeyCondition(schema, obj);
    const options = this.sqlBuilder.buildSelect(schema, schema.properties, results);
    const dataPerSeries = this.queryEntitiesSync(schema, options);
    if (dataPerSeries.length > 1) {
      throw new Error("entity key is duplicated ( model = '" + schema.modelName + "' key = '" + JSON.stringify(obj) + "' )");
    }
    return 1 === dataPerSeries.length ? dataPerSeries[0] : undefined;
  }

  private async loadEntityByKey(schema: ModelSchema, obj: ObjectLiteral) {
    const params = this.makeByKeyCondition(schema, obj);
    const options = this.sqlBuilder.buildSelect(schema, schema.properties, params);
    const expRecords = await this.queryEntities(schema, options);
    if (expRecords.length > 1) {
      throw new Error("entity key is duplicated ( model = '" + schema.modelName + "' key = '" + JSON.stringify(obj) + "' )");
    }
    return 1 === expRecords.length ? expRecords[0] : undefined;
  }

  private replaceJsonProperties(value: ModelSchema, obj: ObjectLiteral) {
    if (0 === value.jsonProperties.length) {
      return obj;
    }
    const inner = Object.assign({}, obj);
    value.jsonProperties.forEach((key) => {
      if (Reflect.has(inner, key)) {
        inner[key] = JSON.parse(String(obj[key])); // deepCopy
      }
    });
    return inner;
  }

  private replaceEntitiesJsonPropertis(schema: ModelSchema, obj: ObjectLiteral) {
    return 0 === schema.jsonProperties.length ? obj : obj.map((whilstNext) => {
      return this.replaceJsonProperties(schema, whilstNext);
    });
  }

  public async load(schema: ModelSchema, obj: ObjectLiteral) {
    const entity = this.getCachedEntity(schema, obj);
    if (undefined !== entity) {
      return entity;
    }
    const loadedEntity = await this.loadEntityByKey(schema, obj);
    if (undefined === loadedEntity) {
      return undefined;
    }
    const data = this.entityTracker.trackPersistent(schema, loadedEntity);
    return schema.copyProperties(data, true);
  }

  public loadSync(schema: ModelSchema, key: ObjectLiteral) {
    const entity = this.getCachedEntity(schema, key);
    if (undefined !== entity) {
      return entity;
    }
    const loadedEntity = this.loadEntityByKeySync(schema, key);
    if (undefined === loadedEntity) {
      return;
    }
    const data = this.entityTracker.trackPersistent(schema, loadedEntity);
    return schema.copyProperties(data, true);
  }

  public getChanges() {
    return this.entityTracker.getConfirmedChanges();
  }

  private normalizeEntityKey(schema: ModelSchema, key: ObjectLiteral) {
    const result = schema.resolveKey(key);
    return result;
  }

  private getCached(schema: ModelSchema, keyvalue: ObjectLiteral) {
    const primaryKeyMetadata = this.normalizeEntityKey(schema, keyvalue);
    const this_area = this.entityTracker.getTrackingEntity(schema, primaryKeyMetadata.key);

    // TODO: refactor return
    return this_area || (primaryKeyMetadata.isPrimaryKey ? this.sessionCache.get(schema.modelName, primaryKeyMetadata.key) : this.sessionCache.getUnique(schema.modelName, primaryKeyMetadata.uniqueName, primaryKeyMetadata.key));
  }

  private getTrackingOrCachedEntity(url, id) {
    const cached = this.getCached(url, id);
    return undefined === cached ? undefined : codeContract.deepCopy(cached);
  }

  public getCachedEntity(schema: ModelSchema, key: ObjectLiteral) {
    const cached = this.getCached(schema, key);
    return undefined === cached ? undefined : codeContract.deepCopy(cached);
  }

  private clearLocks() {
    this.unconfirmedLocks.clear();
    this.confirmedLocks.clear();
  }

  private confirmLocks() {
    this.unconfirmedLocks.forEach((e) => {
      return this.confirmedLocks.add(e);
    });
  }

  public lockInThisSession(lockname: string, option = false) {
    if (!(this.confirmedLocks.has(lockname) || this.unconfirmedLocks.has(lockname))) {
      // check logic
      (this.entityTracker.isConfirming ? this.unconfirmedLocks : this.confirmedLocks).add(lockname);
      this.log.trace("SUCCESS lock name = '" + lockname + "'");
      return true;
    }
    // TODO check
    if (this.log.warn('FAILD lock ' + lockname), !option) {
      throw new Error('Lock name = ' + lockname + ' exists already');
    }
    return false;
  }

  public async saveChanges(height?: number) {
    const realHeight = height || ++this.sessionSerial;
    this.log.trace('BEGIN saveChanges ( serial = ' + realHeight + ' )');

    this.commitEntityTransaction();
    performance.Utils.Performace.time('Build sqls');
    const value = this.trackerSqlBuilder.buildChangeSqls();
    performance.Utils.Performace.restartTime('Execute sqls (' + value.length + ')');
    const queryRunner = await this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (let i = 0; i < value.length; ++i) {
        const one = value[i];
        const params = Array.from(one.parameters || []);
        queryRunner.query(one.query, params);
      }

      await queryRunner.commitTransaction();

      performance.Utils.Performace.restartTime('Accept changes');
      this.entityTracker.acceptChanges(realHeight);
      performance.Utils.Performace.endTime();
      this.clearLocks();
      this.sessionSerial = realHeight;
      this.log.trace('SUCCESS saveChanges ( serial = ' + realHeight + ' )');
      return realHeight;
    } catch (expectedCommand) {
       this.log.error('FAILD saveChanges ( serial = ' + realHeight + ' )', expectedCommand);
       await queryRunner.rollbackTransaction();
       this.entityTracker.rejectChanges();
       throw expectedCommand;
    } finally {
      await queryRunner.release();
    }
  }

  public async rollbackChanges(height: number) {
    if (this.sessionSerial < height) {
      return this.sessionSerial;
    }
    const t = this.sessionSerial;

    this.log.trace('BEGIN rollbackChanges ( serial = ' + height + ' )');
    const rollbackSql = await this.trackerSqlBuilder.buildRollbackChangeSqls(height + 1);
    // const transaction = await this.connection.beginTrans();

    const queryRunner = await this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < rollbackSql.length; ++i) {
        const one = rollbackSql[i];
        queryRunner.query(one.query);
      }

      // await this.connection.executeBatch(rollbackSql);
      await queryRunner.commitTransaction();

      this.entityTracker.rejectChanges();
      await this.entityTracker.rollbackChanges(height + 1);
      this.clearLocks();
      this.sessionSerial = height;
      this.log.trace('SUCCESS rollbackChanges (serial : ' + t + ' -> ' + this.sessionSerial+ ')');
      return this.sessionSerial;
    } catch (expectedCommand) {
       this.log.error('FAILD rollbackChanges (serial : ' + t + ' -> ' + this.sessionSerial + ')', expectedCommand);
       await queryRunner.rollbackTransaction();
       throw expectedCommand;
    }
  }

  private ensureEntityTracking(schema: ModelSchema, key: ObjectLiteral) {
    let cachedObj = this.getCached(schema, key);
    if (undefined === cachedObj) {
      const data = this.loadEntityByKeySync(schema, key);
      if (undefined === data) {
        throw Error("Entity not found ( model = '" + schema.modelName + "', key = '" + JSON.stringify(key) + "' )");
      }
      cachedObj = this.entityTracker.trackPersistent(schema, data);
    }
    return cachedObj;
  }

  public update(schema: ModelSchema, obj: ObjectLiteral, modifier: ObjectLiteral) {
    const tracked = this.ensureEntityTracking(schema, obj);
    this.entityTracker.trackModify(schema, tracked, modifier);
  }

  public increase(schema: ModelSchema, keyObj: ObjectLiteral, obj: ObjectLiteral) {
    const end = this.ensureEntityTracking(schema, keyObj);
    const endColorCoords = {};
    Object.keys(obj).forEach((i) => {
      endColorCoords[i] = undefined === end[i] ? obj[i] : obj[i] + end[i];
    });
    this.entityTracker.trackModify(schema, end, endColorCoords);
    return endColorCoords;
  }

  public delete(schema: ModelSchema, condition: ObjectLiteral) {
    const tracked = this.ensureEntityTracking(schema, condition);
    this.entityTracker.trackDelete(schema, tracked);
  }

  private async beginTransaction() {
    return await this.connection.beginTrans();
  }

  public beginEntityTransaction() {
    this.entityTracker.beginConfirm();
  }

  public commitEntityTransaction() {
    this.entityTracker.confirm();

    this.log.trace('commit locks ' + DbSession.setToString(this.unconfirmedLocks));
    this.unconfirmedLocks.forEach((e) => {
      return this.confirmedLocks.add(e);
    });
  }

  public rollbackEntityTransaction() {
    this.entityTracker.cancelConfirm();
    this.log.trace('rollback locks ' + DbSession.setToString(this.unconfirmedLocks));
    this.unconfirmedLocks.clear();
  }

  /**
   * @returns -1 -> (no blocks); 0 -> genesisBlock; 1... -> normal blocks
   */
  public async getMaxBlockHeight() {
    const result = await this.connection.query('select max(height) as maxheight from block;');
    const value = result[0].maxheight;

    if (value === undefined || value == null) {
      return -1;
    } else {
      return Number(value);
    }
  }

  public async getBlockByHeight(height: number) {
    const result = await this.connection.createQueryBuilder()
      .select('b')
      .from(Block, 'b')
      .where('b.height = :height', { height })
      .getOne();
    return result;
  }

  public async getBlockById(id: string) {
    // TODO: remove possible SQL injection
    const result = await this.connection.query(`select * from block where id = '${id}'`);
    return result[0];
  }

  public async getBlocksByHeightRange(min: number, max: number) {
    const blocks = await this.connection.createQueryBuilder()
      .select('b')
      .from(Block, 'b')
      .where('b.height >= :min AND b.height <= :max', {
        min,
        max,
      })
      .getMany();
    return blocks;
  }

  public async getTransactionsByBlockHeight(height: number) {
    const trans = await this.connection.createQueryBuilder()
      .select('t')
      .from(Transaction, 't')
      .where('t.height = :height', { height: Number(height) })
      .getMany();
    return trans;
  }

  private get isOpen() {
    return this.connection && this.connection.isConnected;
  }

  private static setToString(locks: Set<string>) {
    const data = Array.from(locks.keys());
    return JSON.stringify(data);
  }
}
