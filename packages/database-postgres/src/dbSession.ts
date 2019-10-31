import { LogManager, LoggerWrapper } from './logger';
import { isArray } from 'util';
import { LRUEntityCache } from './lruEntityCache';
import { JsonSqlBuilder } from './jsonSQLBuilder';
import * as CodeContract from './codeContract';
import { BasicTrackerSqlBuilder } from './basicTrackerSqlBuilder';
import {
  BasicEntityTracker,
  LoadChangesHistoryAction,
} from './basicEntityTracker';
import { Connection, ObjectLiteral } from 'typeorm';
import { ModelSchema } from './modelSchema';

import { Block } from './entity/Block';
import { Transaction } from './entity/Transaction';
import * as _ from 'lodash';
import { BigNumber } from 'bignumber.js';

export class DbSession {
  public static readonly DEFAULT_HISTORY_VERSION_HOLD = 10;

  private log: LoggerWrapper;
  private sessionSerial: string;
  private connection: Connection;
  private unconfirmedLocks: Set<string>;
  private confirmedLocks: Set<string>;
  private schemas: Map<string, ModelSchema>;
  private sessionCache: LRUEntityCache;
  private sqlBuilder: JsonSqlBuilder;
  private entityTracker: BasicEntityTracker;
  private trackerSqlBuilder: BasicTrackerSqlBuilder;

  constructor(
    connection: Connection,
    historyChanges: LoadChangesHistoryAction,
    schemas: Map<string, ModelSchema>,
    maxHistoryVersionsHold?: number
  ) {
    this.log = LogManager.getLogger('DbSession');
    this.sessionSerial = String(-1);
    this.connection = connection;
    this.unconfirmedLocks = new Set<string>();
    this.confirmedLocks = new Set<string>();
    this.schemas = schemas;
    this.sessionCache = new LRUEntityCache(this.schemas);
    this.sqlBuilder = new JsonSqlBuilder();
    const howManyVersionsToHold =
      maxHistoryVersionsHold || DbSession.DEFAULT_HISTORY_VERSION_HOLD;

    this.entityTracker = new BasicEntityTracker(
      this.sessionCache,
      this.schemas,
      howManyVersionsToHold,
      LogManager.getLogger('BasicEntityTracker'),
      historyChanges
    );
    this.trackerSqlBuilder = new BasicTrackerSqlBuilder(
      this.entityTracker,
      this.schemas,
      this.sqlBuilder
    );
  }

  private makeByKeyCondition(schema: ModelSchema, key: ObjectLiteral) {
    return schema.resolveKey(key).key;
  }

  private trackPersistentEntities(
    schema: ModelSchema,
    entities,
    option = false
  ) {
    const result = [];
    entities.forEach(entity => {
      const end = schema.getPrimaryKey(entity);
      const height = this.entityTracker.getTrackingEntity(schema, end);
      const param =
        option && undefined !== height
          ? height
          : this.entityTracker.trackPersistent(schema, entity);
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
    const result = await this.connection.query(
      queryObject.query,
      queryObject.parameters
    );
    return this.replaceEntitiesJsonPropertis(schema, result);
  }

  public async initSerial(serial: string) {
    this.sessionSerial = serial;
    if (new BigNumber(serial).isGreaterThanOrEqualTo(0)) {
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

  public loadAll(schema: ModelSchema) {
    if (schema.memCached && this.sessionCache.existsModel(schema.modelName)) {
      const entities = this.sessionCache.getAll(schema.modelName) || [];
      return this.trackPersistentEntities(schema, entities, true);
    }
    return [];
  }

  public async getMany(schema: ModelSchema, condition, cache = true) {
    // TODO, refactor
    const options = this.sqlBuilder.buildSelect(
      schema,
      schema.properties,
      condition
    );
    const result = await this.queryEntities(schema, options);
    return cache ? this.trackPersistentEntities(schema, result, true) : result;
  }

  public async queryByJson(schema: ModelSchema, obj: ObjectLiteral) {
    const type = this.sqlBuilder.buildSelect(schema, obj);
    return await this.queryEntities(schema, type);
  }

  public async exists(schema: ModelSchema, condition: ObjectLiteral) {
    // look at the In operator, think of something other differentf
    let queryBuilder = this.connection
      .createQueryBuilder()
      .select('x')
      .from(schema.modelName, 'x');

    const whereKeys = Object.keys(condition);
    if (whereKeys.length > 1) {
      throw new Error('only one property is allowed on WHERE clause');
    }

    const propName = whereKeys[0];
    const propValue = condition[propName];
    if (Array.isArray(propValue)) {
      queryBuilder = queryBuilder.where(
        `x.${propName} IN (:...${propName})`,
        condition
      );
    } else {
      queryBuilder = queryBuilder.where(
        `x.${propName} = :${propName}`,
        condition
      );
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  public async count(schema: ModelSchema, condition: ObjectLiteral) {
    const range = await this.queryByJson(schema, {
      fields: [
        {
          expression: 'count(*)',
        },
      ],
      condition: condition,
    });
    return isArray(range) ? parseInt(range[0].count) : 0;
  }

  public create(schema: ModelSchema, entity: ObjectLiteral) {
    const primaryKey = schema.getNormalizedPrimaryKey(entity);
    const isValidPrimaryKey = schema.isValidPrimaryKey(primaryKey);
    if (
      undefined === primaryKey ||
      _.isEmpty(primaryKey) ||
      !isValidPrimaryKey
    ) {
      throw new Error(
        "entity must contains primary key ( model = '" +
          schema.modelName +
          "' entity = '" +
          entity +
          "' )"
      );
    }
    if (this.sessionCache.exists(schema.modelName, primaryKey)) {
      throw new Error(
        "entity exists already ( model = '" +
          schema.modelName +
          "' key = '" +
          JSON.stringify(primaryKey) +
          "' )"
      );
    }
    return CodeContract.deepCopy(this.entityTracker.trackNew(schema, entity));
  }

  private async loadEntityByKey(schema: ModelSchema, obj: ObjectLiteral) {
    const params = this.makeByKeyCondition(schema, obj);
    const options = this.sqlBuilder.buildSelect(
      schema,
      schema.properties,
      params
    );
    const expRecords = await this.queryEntities(schema, options);
    if (expRecords.length > 1) {
      throw new Error(
        "entity key is duplicated ( model = '" +
          schema.modelName +
          "' key = '" +
          JSON.stringify(obj) +
          "' )"
      );
    }
    return 1 === expRecords.length ? expRecords[0] : undefined;
  }

  private replaceJsonProperties(value: ModelSchema, obj: ObjectLiteral) {
    if (0 === value.jsonProperties.length) {
      return obj;
    }
    const inner = Object.assign({}, obj);
    value.jsonProperties.forEach(key => {
      if (Reflect.has(inner, key)) {
        inner[key] = JSON.parse(String(obj[key])); // deepCopy
      }
    });
    return inner;
  }

  private replaceEntitiesJsonPropertis(
    schema: ModelSchema,
    obj: ObjectLiteral
  ) {
    return 0 === schema.jsonProperties.length
      ? obj
      : obj.map(whilstNext => {
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

  public getChanges() {
    return this.entityTracker.getConfirmedChanges();
  }

  private normalizeEntityKey(schema: ModelSchema, key: ObjectLiteral) {
    const result = schema.resolveKey(key);
    return result;
  }

  private getCached(schema: ModelSchema, keyvalue: ObjectLiteral) {
    const primaryKeyMetadata = this.normalizeEntityKey(schema, keyvalue);
    if (primaryKeyMetadata === undefined) {
      throw new Error('no primary key of entity found');
    }
    const this_area = this.entityTracker.getTrackingEntity(
      schema,
      primaryKeyMetadata.key
    );

    // TODO: refactor return
    return (
      this_area ||
      (primaryKeyMetadata.isPrimaryKey
        ? this.sessionCache.get(schema.modelName, primaryKeyMetadata.key)
        : this.sessionCache.getUnique(
            schema.modelName,
            primaryKeyMetadata.uniqueName,
            primaryKeyMetadata.key
          ))
    );
  }

  public getCachedEntity(schema: ModelSchema, key: ObjectLiteral) {
    const cached = this.getCached(schema, key);
    return undefined === cached ? undefined : CodeContract.deepCopy(cached);
  }

  private clearLocks() {
    this.unconfirmedLocks.clear();
    this.confirmedLocks.clear();
  }

  public lockInThisSession(lockname: string, option = false) {
    if (
      !(
        this.confirmedLocks.has(lockname) || this.unconfirmedLocks.has(lockname)
      )
    ) {
      // check logic
      (this.entityTracker.isConfirming
        ? this.unconfirmedLocks
        : this.confirmedLocks
      ).add(lockname);
      this.log.trace("SUCCESS lock name = '" + lockname + "'");
      return true;
    }
    // TODO check
    if ((this.log.warn('FAILD lock ' + lockname), !option)) {
      throw new Error('Lock name = ' + lockname + ' exists already');
    }
    return false;
  }

  public async saveChanges(height?: string) {
    const realHeight =
      height ||
      (this.sessionSerial = new BigNumber(this.sessionSerial)
        .plus(1)
        .toFixed());
    this.log.trace('BEGIN saveChanges ( serial = ' + realHeight + ' )');

    this.commitEntityTransaction();
    const value = this.trackerSqlBuilder.buildChangeSqls();

    const queryRunner = await this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (let i = 0; i < value.length; ++i) {
        const one = value[i];
        // @ts-ignore
        const params = Array.from(one.parameters || []);
        await queryRunner.query(one.query, params);
      }

      await queryRunner.commitTransaction();

      this.entityTracker.acceptChanges(realHeight);
      this.clearLocks();
      this.sessionSerial = realHeight;
      this.log.trace('SUCCESS saveChanges ( serial = ' + realHeight + ' )');
      return realHeight;
    } catch (err) {
      this.log.error('FAILD saveChanges ( serial = ' + realHeight + ' )', err);
      await queryRunner.rollbackTransaction();
      this.entityTracker.rejectChanges();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  public async rollbackChanges(height: string) {
    if (new BigNumber(this.sessionSerial).isLessThan(height)) {
      return this.sessionSerial;
    }
    const t = this.sessionSerial;

    this.log.trace('BEGIN rollbackChanges ( serial = ' + height + ' )');
    const rollbackSql = await this.trackerSqlBuilder.buildRollbackChangeSqls(
      new BigNumber(height).plus(1).toFixed()
    );

    const queryRunner = await this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < rollbackSql.length; ++i) {
        const one = rollbackSql[i];
        await queryRunner.query(one.query);
      }

      // await this.connection.executeBatch(rollbackSql);
      await queryRunner.commitTransaction();

      this.entityTracker.rejectChanges();
      await this.entityTracker.rollbackChanges(
        new BigNumber(height).plus(1).toFixed()
      );
      this.clearLocks();
      this.sessionSerial = height;
      this.log.trace(
        'SUCCESS rollbackChanges (serial : ' +
          t +
          ' -> ' +
          this.sessionSerial +
          ')'
      );
      return this.sessionSerial;
    } catch (err) {
      this.log.error(
        'FAILD rollbackChanges (serial : ' +
          t +
          ' -> ' +
          this.sessionSerial +
          ')',
        err
      );
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async ensureEntityTracking(schema: ModelSchema, key: ObjectLiteral) {
    let cachedObj = this.getCached(schema, key);
    if (undefined === cachedObj) {
      const data = await this.loadEntityByKey(schema, key);
      if (undefined === data) {
        throw Error(
          "Entity not found ( model = '" +
            schema.modelName +
            "', key = '" +
            JSON.stringify(key) +
            "' )"
        );
      }
      cachedObj = this.entityTracker.trackPersistent(schema, data);
    }
    return cachedObj;
  }

  public async update(
    schema: ModelSchema,
    obj: ObjectLiteral,
    modifier: ObjectLiteral
  ) {
    const tracked = await this.ensureEntityTracking(schema, obj);
    this.entityTracker.trackModify(schema, tracked, modifier);
  }

  public async increase(
    schema: ModelSchema,
    keyObj: ObjectLiteral,
    obj: ObjectLiteral
  ) {
    const end = await this.ensureEntityTracking(schema, keyObj);
    const result = {};
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string' && typeof end[key] === 'string') {
        result[key] =
          end[key] === undefined
            ? obj[key]
            : new BigNumber(obj[key]).plus(end[key]).toFixed();
      } else {
        result[key] = end[key] === undefined ? obj[key] : obj[key] + end[key];
      }
    });
    this.entityTracker.trackModify(schema, end, result);
    return result;
  }

  public async delete(schema: ModelSchema, condition: ObjectLiteral) {
    const tracked = await this.ensureEntityTracking(schema, condition);
    this.entityTracker.trackDelete(schema, tracked);
  }

  public beginEntityTransaction() {
    this.entityTracker.beginConfirm();
  }

  public commitEntityTransaction() {
    this.entityTracker.confirm();

    this.log.trace(
      'commit locks ' + DbSession.setToString(this.unconfirmedLocks)
    );
    this.unconfirmedLocks.forEach(e => {
      return this.confirmedLocks.add(e);
    });
  }

  public rollbackEntityTransaction() {
    this.entityTracker.cancelConfirm();
    this.log.trace(
      'rollback locks ' + DbSession.setToString(this.unconfirmedLocks)
    );
    this.unconfirmedLocks.clear();
  }

  /**
   * @returns -1 -> (no blocks); 0 -> genesisBlock; 1... -> normal blocks
   */
  public async getMaxBlockHeight() {
    const result = await this.connection.query(
      'select max(height) as maxheight from block;'
    );
    const value = result[0].maxheight;

    if (value === undefined || value == null) {
      return String(-1);
    } else {
      return String(value);
    }
  }

  public async getBlockByHeight(height: string) {
    const result = await this.connection
      .createQueryBuilder()
      .select('b')
      .from(Block, 'b')
      .where('b.height = :height', { height })
      .getOne();
    return result;
  }

  public async getBlockById(id: string) {
    const result = await this.connection
      .createQueryBuilder()
      .select('b')
      .from(Block, 'b')
      .where('b.id = :id', { id })
      .getOne();
    return result;
  }

  public async getBlocksByHeightRange(min: string, max: string) {
    const blocks = await this.connection
      .createQueryBuilder()
      .select('b')
      .from(Block, 'b')
      .where('b.height >= :min AND b.height <= :max', {
        min,
        max,
      })
      .getMany();
    return blocks;
  }

  public async getTransactionsByBlockHeight(height: string) {
    const trans = await this.connection
      .createQueryBuilder()
      .select('t')
      .from(Transaction, 't')
      .where('t.height = :height', { height })
      .getMany();
    return trans;
  }

  private static setToString(locks: Set<string>) {
    const data = Array.from(locks.keys());
    return JSON.stringify(data);
  }
}
