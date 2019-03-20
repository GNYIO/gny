import * as codeContract from './codeContract';
import * as enumerations from './entityChangeType';
import { isFunction } from 'util';
import * as lodash from 'lodash';
import { toArray } from './helpers/index';
import { ModelSchema } from './modelSchema';
import { LRUEntityCache, PropertyValue } from './lruEntityCache';
import { LoggerWrapper } from './logger';
import { ObjectLiteral } from 'typeorm';

export interface PropertyChange {
  name: string;
  original?: any;
  current?: any;
}

export interface EntityChanges {
  type: enumerations.EntityChangeType;
  dbVersion: number;
  model: string;
  primaryKey: ObjectLiteral;
  propertyChanges: PropertyChange[];
}

export type LoadChangesHistoryAction = (fromVersion: number, toVersion: number) => Promise<Map<number, EntityChanges[]>>;



export class BasicEntityTracker {
  private log: LoggerWrapper;
  private cache: LRUEntityCache;
  private confirming: boolean;
  private schemas: Map<string, ModelSchema>;
  private doLoadHistory: LoadChangesHistoryAction;
  private history: Map<number, EntityChanges[]>;
  private allTrackingEntities: Map<string, any>;
  private unconfirmedChanges: EntityChanges[];
  private confirmedChanges: EntityChanges[];
  private minVersion: number;
  private currentVersion: number;
  private maxHistoryVersionsHold: number;

  /**
   * @constructor
   * @param {string} sessionCache
   * @param {string} schemas
   * @param {number} maxHistoryVersionsHold
   * @param {!Object} logger
   * @param {?} onLoadHistory
   */
  constructor(sessionCache: LRUEntityCache, schemas: Map<string, ModelSchema>, maxHistoryVersionsHold: number, logger: LoggerWrapper, onLoadHistory: LoadChangesHistoryAction) {
    this.log = logger;
    this.cache = sessionCache;
    this.confirming = false;
    this.schemas = schemas;
    this.doLoadHistory = onLoadHistory;
    this.history = new Map<number, EntityChanges[]>();
    this.allTrackingEntities = new Map<string, any>();
    this.unconfirmedChanges = [];
    this.confirmedChanges = [];
    this.minVersion = -1;
    this.currentVersion = -1;
    this.maxHistoryVersionsHold = maxHistoryVersionsHold;
  }

  private async loadHistory(height: number, minHeight: number) {
    if (isFunction(this.doLoadHistory)) {
      await this.doLoadHistory(height, minHeight);
    }
    return Promise.resolve(new Map<number, EntityChanges[]>());
  }

  public async initVersion(version: number) {
    if (-1 === this.currentVersion) {
      const history = await this.loadHistory(version, version);
      this.attachHistory(history);
    }
  }

  private makeModelAndKey(schema: ModelSchema, key: ObjectLiteral) {
    const b = {
      m : schema.modelName,
      k : key
    };
    return JSON.stringify(b);
  }

  private splitModelAndKey(modelAndKey: string) {
    const params = JSON.parse(modelAndKey);
    return {
      model : params.m,
      key : params.k
    };
  }

  private isTracking(schema: ModelSchema, key) {
    const uniqueSchemaKeyString = this.makeModelAndKey(schema, key);
    return this.allTrackingEntities.has(uniqueSchemaKeyString);
  }

  public getConfimedChanges() {
    return this.confirmedChanges;
  }

  private buildTrackingEntity(model: ModelSchema, data: ObjectLiteral, state: enumerations.EntityState) {
    return data;
  }

  private ensureNotracking(schema: ModelSchema, primaryKey: ObjectLiteral) {
    if (undefined !== this.getTrackingEntity(schema, primaryKey)) {
      throw Error("Entity (model='" + schema.modelName + "', key='" + JSON.stringify(primaryKey) + "') is tracking already");
    }
  }

  private getTracking(schema: ModelSchema, primaryKey: ObjectLiteral) {
    const info = this.getTrackingEntity(schema, primaryKey);
    if (undefined === info) {
      throw Error("Entity (model='" + schema.modelName + "', key='" + JSON.stringify(primaryKey) + "') is not tracking");
    }
    return info;
  }

  public trackNew(schema: ModelSchema, entity: ObjectLiteral) {
    const primaryKey = schema.getNormalizedPrimaryKey(entity);
    this.ensureNotracking(schema, primaryKey);
    const entityCopy = lodash.cloneDeep(entity);
    schema.setDefaultValues(entityCopy);

    entityCopy[enumerations.ENTITY_VERSION_PROPERTY] = 1;
    const data = this.buildTrackingEntity(schema, entityCopy, enumerations.EntityState.New);
    this.cache.put(schema.modelName, primaryKey, data);
    const changes = this.buildCreateChanges(schema, entityCopy);
    this.changesStack.push(changes);
    return data;
  }

  public trackPersistent(schema: ModelSchema, entity) {
    const key = schema.getNormalizedPrimaryKey(entity);
    this.ensureNotracking(schema, key);
    const copy = lodash.cloneDeep(entity);
    const data = this.buildTrackingEntity(schema, copy, enumerations.EntityState.Persistent);
    this.cache.put(schema.modelName, key, data);
    return data;
  }

  public trackDelete(schema: ModelSchema, trackingEntity: ObjectLiteral) {
    this.changesStack.push(this.buildDeleteChanges(schema, trackingEntity, trackingEntity._version_));
    this.cache.evit(schema.modelName, schema.getNormalizedPrimaryKey(trackingEntity));
  }

  public trackModify(schema: ModelSchema, trackingEntity, modifier) {
    const result: PropertyValue[] = Object.keys(modifier)
      .filter((attr) => {
        // TODO refactor
        return schema.isValidProperty(attr) && attr !== enumerations.ENTITY_VERSION_PROPERTY && !lodash.isEqual(trackingEntity[attr], modifier[attr]);
      })
      .map((region) => {
        return {
          name : region,
          value : modifier[region]
        };
      });

    if (0 !== result.length) {
      this.changesStack.push(this.buildModifyChanges(schema, trackingEntity, result, ++trackingEntity._version_));
      this.cache.refreshCached(schema.modelName, schema.getNormalizedPrimaryKey(trackingEntity), result);
    }
  }

  public getTrackingEntity(schema: ModelSchema, key: ObjectLiteral) {
    const result = schema.resolveKey(key);
    if (undefined !== result) {
      if (result.isPrimaryKey) {
        return this.cache.get(schema.modelName, result.key);
      } else {
        return this.cache.getUnique(schema.modelName, result.uniqueName, result.key);
      }
      // return result.isPrimaryKey ? this.cache.get(schema.modelSchema, result.key) : this.cache.getUnique(schema.name, result.uniqueName, result.key);
    }
  }

  public acceptChanges(height: number) {
    this.log.trace('BEGIN acceptChanges Version = ' + height);

    this.history.set(height, this.confirmedChanges);
    this.confirmedChanges = [];
    this.removeExpiredHistory();
    this.allTrackingEntities.clear();
    this.minVersion = -1 === this.minVersion ? height : this.minVersion;
    this.currentVersion = height;

    this.log.trace('SUCCESS acceptChanges Version = ' + height);
  }

  private buildCreateChanges(schema: ModelSchema, obj) {
    const result = new Array;
    let key;
    for (key in obj) {
      if (schema.isValidProperty(key)) {
        result.push({
          name : key,
          current : obj[key]
        });
      }
    }
    return {
      type : enumerations.EntityChangeType.New,
      model : schema.modelName,
      primaryKey : schema.getNormalizedPrimaryKey(obj),
      dbVersion : 1,
      propertyChanges : result
    } as EntityChanges;
  }

  private buildModifyChanges(schema: ModelSchema, currentObj: ObjectLiteral, changes, version) {
    const results: PropertyChange[] = [];
    changes.forEach((data) => {
      return results.push({
        name : data.name,
        current : data.value,
        original : currentObj[data.name]
      });
    });
    results.push({
      name : enumerations.ENTITY_VERSION_PROPERTY,
      current : version,
      original : version - 1
    });
    return {
      type : enumerations.EntityChangeType.Modify,
      model : schema.modelName,
      primaryKey : schema.getNormalizedPrimaryKey(currentObj),
      dbVersion : version,
      propertyChanges : results
    } as EntityChanges;
  }

  private buildDeleteChanges(schema: ModelSchema, value: ObjectLiteral, dbVersion: number) {
    const propertyChanges = [];
    let name;
    for (name in value) {
      if (schema.isValidProperty(name)) {
        propertyChanges.push({
          name : name,
          original : value[name]
        });
      }
    }
    return {
      type : enumerations.EntityChangeType.Delete,
      model : schema.modelName,
      primaryKey : schema.getNormalizedPrimaryKey(value),
      dbVersion : dbVersion,
      propertyChanges : propertyChanges
    } as EntityChanges;
  }

  private undoEntityChanges(change: EntityChanges) {
    switch (change.type) {
      case enumerations.EntityChangeType.New:
        if (this.cache.get(change.model, change.primaryKey)) {
          this.cache.evit(change.model, change.primaryKey);
        }
        break;
      case enumerations.EntityChangeType.Modify:
        const propertyValues: PropertyValue[] = change.propertyChanges.map((onePropChange) => {
          return {
            name : onePropChange.name,
            value : onePropChange.original
          };
        });
        this.cache.refreshCached(change.model, change.primaryKey, propertyValues);
        break;
      case enumerations.EntityChangeType.Delete:
        const obj: ObjectLiteral = codeContract.makeJsonObject(change.propertyChanges, (engineDiscovery) => engineDiscovery.name, (vOffset) => vOffset.original);
        const schema = this.schemas.get(change.model);
        const result: ObjectLiteral = this.buildTrackingEntity(schema, obj, enumerations.EntityState.Persistent);
        this.trackPersistent(schema, result);
    }
  }

  private undoChanges(entityChanges: EntityChanges[]) {
    let oneChange: EntityChanges = undefined;
    for (; undefined !== (oneChange = entityChanges.pop());) {
      this.undoEntityChanges(oneChange);
    }
  }

  public rejectChanges() {
    this.cancelConfirm();
    this.undoChanges(this.confirmedChanges);
  }

  public async rollbackChanges(toBlockHeight: number) {
    if (toBlockHeight > this.currentVersion) {
      return;
    }
    const copyOfVersion = this.currentVersion;
    this.log.trace('BEGIN rollbackChanges Version : ' + copyOfVersion);

    await this.loadHistoryUntil(toBlockHeight);
    for (; this.currentVersion >= toBlockHeight;) {
      const changes = this.getHistoryByVersion(this.currentVersion);
      this.undoChanges(changes);
      this.currentVersion--;
    }
    this.minVersion = Math.min(this.minVersion, this.currentVersion);

    this.log.trace('SUCCESS rollbackChanges Version : ' + copyOfVersion + ' -> ' + this.currentVersion);
  }

  public beginConfirm() {
    this.confirming = true;
    if (this.unconfirmedChanges.length > 0) {
      this.log.warn('unconfimred changes(' + this.unconfirmedChanges.length + ') detected , you should call commit or cancel changes');
    }
    this.unconfirmedChanges = [];

    this.log.trace('BEGIN beginConfirm');
  }


  public confirm() { // TODO refactor
    // let _selectedKeys;
    // (_selectedKeys = this.confirmedChanges).push.apply(_selectedKeys, toArray(this.unconfirmedChanges));
    this.confirmedChanges.push(...this.unconfirmedChanges);

    this.unconfirmedChanges = [];
    this.confirming = false;

    this.log.trace('SUCCESS confirm ');
  }


  public cancelConfirm() {
    this.undoChanges(this.unconfirmedChanges);
    this.confirming = false;

    this.log.trace('SUCCESS cancelConfirm ');
  }

  private attachHistory(history: Map<number, EntityChanges[]>) {
    this.log.info('BEGIN attachHistory history version = ' + JSON.stringify(this.historyVersion));

    history.forEach((ideaExample, index) => {
      this.history.set(index, ideaExample);
      this.minVersion = this.minVersion < 0 ? index : Math.min(index, this.minVersion);
      this.currentVersion = Math.max(index, this.currentVersion);
    });

    this.log.info('SUCCESS attachHistory size = ' + JSON.stringify(history ? history.size : 0));
  }

  private getHistoryByVersion(item: number, option = false) {
    // !this.history.has(item) && isSelectionByClickEnabled && this.history.set(item, new Array);
    if (!this.history.has(item) && option) {
      this.history.set(item, []);
    }
    return this.history.get(item);
  }

  private async loadHistoryUntil(height: number) {
    if (height < this.minVersion) {
      const history = await this.loadHistory(height, this.minVersion);
      this.attachHistory(history);
    }
  }

  private removeExpiredHistory() {
    if (this.currentVersion - this.minVersion > this.maxHistoryVersionsHold) {
      this.clearHistoryBefore(this.currentVersion - this.maxHistoryVersionsHold);
    }
  }


  public async getChangesUntil(height: number) {
    await this.loadHistoryUntil(height);
    const result = [];
    let heightCopy = height;

    for (; heightCopy <= this.currentVersion;) {
      const oneHistory = this.getHistoryByVersion(heightCopy++);
      if (oneHistory) {
        result.push(toArray(oneHistory));
      }
    }
    return result;
  }


  private clearHistoryBefore(height) {
    if (!(this.minVersion >= height || this.currentVersion < height)) {
      var index = this.minVersion;
      for (; index < height; index++) {
        this.history.delete(index);
      }
      /** @type {number} */
      this.minVersion = height;
    }
  }

  get trackingEntities() {
    return this.allTrackingEntities.values();
  }

  get changesStack() {
    return this.isConfirming ? this.unconfirmedChanges : this.confirmedChanges;
  }

  get isConfirming() {
    return this.confirming;
  }

  get historyVersion() {
    return {
      min : this.minVersion,
      max : this.currentVersion
    };
  }
}
