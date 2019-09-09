import * as CodeContract from './codeContract';
import * as enumerations from './entityChangeType';
import { isFunction } from 'util';
import * as lodash from 'lodash';
import { ModelSchema } from './modelSchema';
import { LRUEntityCache, PropertyValue } from './lruEntityCache';
import { LoggerWrapper } from './logger';
import { ObjectLiteral } from 'typeorm';
import BigNumber from 'bignumber.js';

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

export type LoadChangesHistoryAction = (
  fromVersion: string,
  toVersion: string
) => Promise<Map<string, EntityChanges[]>>;

export class BasicEntityTracker {
  private log: LoggerWrapper;
  private cache: LRUEntityCache;
  private confirming: boolean;
  private schemas: Map<string, ModelSchema>;
  private doLoadHistory: LoadChangesHistoryAction;
  private history: Map<string, EntityChanges[]>;
  private allTrackingEntities: Map<string, any>;
  private unconfirmedChanges: EntityChanges[];
  private confirmedChanges: EntityChanges[];
  private minVersion: string;
  private currentVersion: string;
  private maxHistoryVersionsHold: number;

  /**
   * @constructor
   * @param {string} sessionCache
   * @param {string} schemas
   * @param {number} maxHistoryVersionsHold
   * @param {!Object} logger
   * @param {?} onLoadHistory
   */
  constructor(
    sessionCache: LRUEntityCache,
    schemas: Map<string, ModelSchema>,
    maxHistoryVersionsHold: number,
    logger: LoggerWrapper,
    onLoadHistory: LoadChangesHistoryAction
  ) {
    this.log = logger;
    this.cache = sessionCache;
    this.confirming = false;
    this.schemas = schemas;
    this.doLoadHistory = onLoadHistory;
    this.history = new Map<string, EntityChanges[]>();
    this.allTrackingEntities = new Map<string, any>();
    this.unconfirmedChanges = [];
    this.confirmedChanges = [];
    this.minVersion = String(-1);
    this.currentVersion = String(-1);
    this.maxHistoryVersionsHold = maxHistoryVersionsHold;
  }

  private async loadHistory(height: string, minHeight: string) {
    if (isFunction(this.doLoadHistory)) {
      return await this.doLoadHistory(height, minHeight);
    }
    return Promise.resolve(new Map<string, EntityChanges[]>());
  }

  public async initVersion(version: string) {
    if (new BigNumber(-1).isEqualTo(this.currentVersion)) {
      const history = await this.loadHistory(version, version);
      this.attachHistory(history);
    }
  }

  private makeModelAndKey(schema: ModelSchema, key: ObjectLiteral) {
    const b = {
      m: schema.modelName,
      k: key,
    };
    return JSON.stringify(b);
  }

  // @ts-ignore
  private splitModelAndKey(modelAndKey: string) {
    const params = JSON.parse(modelAndKey);
    return {
      model: params.m,
      key: params.k,
    };
  }

  // @ts-ignore
  private isTracking(schema: ModelSchema, key) {
    const uniqueSchemaKeyString = this.makeModelAndKey(schema, key);
    return this.allTrackingEntities.has(uniqueSchemaKeyString);
  }

  // @ts-ignore
  private buildTrackingEntity(
    model: ModelSchema,
    data: ObjectLiteral,
    state: enumerations.EntityState
  ) {
    return data;
  }

  private ensureNotracking(schema: ModelSchema, primaryKey: ObjectLiteral) {
    if (undefined !== this.getTrackingEntity(schema, primaryKey)) {
      throw Error(
        "Entity (model='" +
          schema.modelName +
          "', key='" +
          JSON.stringify(primaryKey) +
          "') is tracking already"
      );
    }
  }

  // @ts-ignore
  private getTracking(schema: ModelSchema, primaryKey: ObjectLiteral) {
    const info = this.getTrackingEntity(schema, primaryKey);
    if (undefined === info) {
      throw Error(
        "Entity (model='" +
          schema.modelName +
          "', key='" +
          JSON.stringify(primaryKey) +
          "') is not tracking"
      );
    }
    return info;
  }

  public trackNew(schema: ModelSchema, entity: ObjectLiteral) {
    const primaryKey = schema.getNormalizedPrimaryKey(entity);
    this.ensureNotracking(schema, primaryKey);
    const entityCopy = lodash.cloneDeep(entity);
    schema.setDefaultValues(entityCopy);

    entityCopy[enumerations.ENTITY_VERSION_PROPERTY] = 1;
    const data = this.buildTrackingEntity(
      schema,
      entityCopy,
      enumerations.EntityState.New
    );
    this.cache.put(schema.modelName, primaryKey, data);
    const changes = this.buildCreateChanges(schema, entityCopy);
    this.changesStack.push(changes);
    return data;
  }

  public trackPersistent(schema: ModelSchema, entity) {
    const key = schema.getNormalizedPrimaryKey(entity);
    this.ensureNotracking(schema, key);
    const copy = lodash.cloneDeep(entity);
    const data = this.buildTrackingEntity(
      schema,
      copy,
      enumerations.EntityState.Persistent
    );
    this.cache.put(schema.modelName, key, data);
    return data;
  }

  public trackDelete(schema: ModelSchema, trackingEntity: ObjectLiteral) {
    const changes = this.buildDeleteChanges(
      schema,
      trackingEntity,
      trackingEntity._version_
    );
    this.changesStack.push(changes);
    this.cache.evit(
      schema.modelName,
      schema.getNormalizedPrimaryKey(trackingEntity)
    );
  }

  public trackModify(
    schema: ModelSchema,
    trackingEntity: ObjectLiteral,
    modifier
  ) {
    const propertyValues = Object.keys(modifier)
      .filter(key => {
        const validProp = schema.isValidProperty(key);
        const notVersionProp = key !== enumerations.ENTITY_VERSION_PROPERTY;
        const notEqualToModifiedProp = !lodash.isEqual(
          trackingEntity[key],
          modifier[key]
        );

        return validProp && notVersionProp && notEqualToModifiedProp;
      })
      .map(key => {
        return {
          name: key,
          value: modifier[key],
        };
      }) as PropertyValue[];

    if (0 !== propertyValues.length) {
      const changes = this.buildModifyChanges(
        schema,
        trackingEntity,
        propertyValues,
        ++trackingEntity._version_
      );
      this.changesStack.push(changes);
      this.cache.refreshCached(
        schema.modelName,
        schema.getNormalizedPrimaryKey(trackingEntity),
        propertyValues
      );
    }
  }

  public getTrackingEntity(schema: ModelSchema, key: ObjectLiteral) {
    const result = schema.resolveKey(key);
    if (undefined !== result) {
      if (result.isPrimaryKey) {
        return this.cache.get(schema.modelName, result.key);
      } else {
        return this.cache.getUnique(
          schema.modelName,
          result.uniqueName,
          result.key
        );
      }
      // return result.isPrimaryKey ? this.cache.get(schema.modelSchema, result.key) : this.cache.getUnique(schema.name, result.uniqueName, result.key);
    }
  }

  public acceptChanges(height: string) {
    this.log.trace('BEGIN acceptChanges Version = ' + height);

    this.history.set(height, this.confirmedChanges);
    this.confirmedChanges = [];
    this.removeExpiredHistory();
    this.allTrackingEntities.clear();
    this.minVersion = new BigNumber(-1).isEqualTo(this.minVersion)
      ? height
      : this.minVersion;
    this.currentVersion = height;

    this.log.trace('SUCCESS acceptChanges Version = ' + height);
  }

  private buildCreateChanges(schema: ModelSchema, obj: ObjectLiteral) {
    const propertyChanges = [];
    let key;
    for (key in obj) {
      if (schema.isValidProperty(key)) {
        propertyChanges.push({
          name: key,
          current: obj[key],
        });
      }
    }
    const result: EntityChanges = {
      type: enumerations.EntityChangeType.New,
      model: schema.modelName,
      primaryKey: schema.getNormalizedPrimaryKey(obj),
      dbVersion: 1,
      propertyChanges: propertyChanges,
    };
    return result;
  }

  private buildModifyChanges(
    schema: ModelSchema,
    currentObj: ObjectLiteral,
    changes: PropertyValue[],
    dbVersion: number
  ) {
    const propertyChanges: PropertyChange[] = [];
    changes.forEach(data => {
      return propertyChanges.push({
        name: data.name,
        current: data.value,
        original: currentObj[data.name],
      });
    });
    propertyChanges.push({
      name: enumerations.ENTITY_VERSION_PROPERTY,
      current: dbVersion,
      original: dbVersion - 1,
    });
    const result: EntityChanges = {
      type: enumerations.EntityChangeType.Modify,
      model: schema.modelName,
      primaryKey: schema.getNormalizedPrimaryKey(currentObj),
      dbVersion: dbVersion,
      propertyChanges: propertyChanges,
    };
    return result;
  }

  private buildDeleteChanges(
    schema: ModelSchema,
    value: ObjectLiteral,
    dbVersion: number
  ) {
    const propertyChanges = [];
    let name;
    for (name in value) {
      if (schema.isValidProperty(name)) {
        propertyChanges.push({
          name: name,
          original: value[name],
        });
      }
    }
    const result: EntityChanges = {
      type: enumerations.EntityChangeType.Delete,
      model: schema.modelName,
      primaryKey: schema.getNormalizedPrimaryKey(value),
      dbVersion: dbVersion,
      propertyChanges: propertyChanges,
    };
    return result;
  }

  private undoEntityChanges(change: EntityChanges) {
    // console.log(`undoEntityChanges: ${JSON.stringify(change, null, 2)}`);
    switch (change.type) {
      case enumerations.EntityChangeType.New:
        if (this.cache.get(change.model, change.primaryKey)) {
          this.cache.evit(change.model, change.primaryKey);
        }
        break;
      case enumerations.EntityChangeType.Modify:
        const propertyValues: PropertyValue[] = change.propertyChanges.map(
          onePropChange => {
            return {
              name: onePropChange.name,
              value: onePropChange.original,
            };
          }
        );
        this.cache.refreshCached(
          change.model,
          change.primaryKey,
          propertyValues
        );
        break;
      case enumerations.EntityChangeType.Delete:
        const obj: ObjectLiteral = CodeContract.makeJsonObject(
          change.propertyChanges,
          one => one.name,
          one => one.original
        );

        const schema = this.schemas.get(change.model);
        const result: ObjectLiteral = this.buildTrackingEntity(
          schema,
          obj,
          enumerations.EntityState.Persistent
        );
        this.trackPersistent(schema, result);
    }
  }

  private undoChanges(entityChanges: EntityChanges[]) {
    let oneChange: EntityChanges = undefined;
    for (; undefined !== (oneChange = entityChanges.pop()); ) {
      this.undoEntityChanges(oneChange);
    }
  }

  public rejectChanges() {
    this.cancelConfirm();
    this.undoChanges(this.confirmedChanges);
  }

  public async rollbackChanges(toBlockHeight: string) {
    if (new BigNumber(toBlockHeight).isLessThan(this.currentVersion)) {
      return;
    }
    const copyOfVersion = this.currentVersion;
    this.log.trace('BEGIN rollbackChanges Version : ' + copyOfVersion);

    await this.loadHistoryUntil(toBlockHeight);
    for (
      ;
      new BigNumber(this.currentVersion).isGreaterThanOrEqualTo(toBlockHeight);

    ) {
      const changes = this.getHistoryByVersion(this.currentVersion);
      this.undoChanges(changes);
      this.currentVersion = new BigNumber(this.currentVersion)
        .minus(1)
        .toFixed();
    }
    this.minVersion = BigNumber.minimum(
      this.minVersion,
      this.currentVersion
    ).toFixed();

    this.log.trace(
      'SUCCESS rollbackChanges Version : ' +
        copyOfVersion +
        ' -> ' +
        this.currentVersion
    );
  }

  public beginConfirm() {
    this.confirming = true;
    if (this.unconfirmedChanges.length > 0) {
      this.log.warn(
        'unconfimred changes(' +
          this.unconfirmedChanges.length +
          ') detected , you should call commit or cancel changes'
      );
    }
    this.unconfirmedChanges = [];

    this.log.trace('BEGIN beginConfirm');
  }

  public confirm() {
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

  private attachHistory(history: Map<string, EntityChanges[]>) {
    this.log.info(
      'BEGIN attachHistory history version = ' +
        JSON.stringify(this.historyVersion)
    );

    history.forEach((ideaExample, index) => {
      this.history.set(index, ideaExample);
      this.minVersion = new BigNumber(this.minVersion).isLessThan(0)
        ? index
        : BigNumber.minimum(index, this.minVersion).toFixed();
      this.currentVersion = BigNumber.maximum(
        index,
        this.currentVersion
      ).toFixed();
    });

    this.log.info(
      'SUCCESS attachHistory size = ' +
        JSON.stringify(history ? history.size : 0)
    );
  }

  /**
   * @param height The history version
   * @param createEntryIfNotAvailable Creates an history entry for this height if not available
   */
  public getHistoryByVersion(
    height: string,
    createEntryIfNotAvailable = false
  ) {
    // public for testing
    // !this.history.has(item) && isSelectionByClickEnabled && this.history.set(item, new Array);
    if (!this.history.has(height) && createEntryIfNotAvailable) {
      this.history.set(height, []);
    }
    return this.history.get(height);
  }

  private async loadHistoryUntil(height: string) {
    if (new BigNumber(height).isLessThan(this.minVersion)) {
      const history = await this.loadHistory(height, this.minVersion);
      this.attachHistory(history);
    }
  }

  private removeExpiredHistory() {
    if (
      new BigNumber(this.currentVersion)
        .minus(this.minVersion)
        .isGreaterThan(this.maxHistoryVersionsHold)
    ) {
      const toRemove = new BigNumber(this.currentVersion)
        .minus(this.maxHistoryVersionsHold)
        .toFixed();
      this.clearHistoryBefore(toRemove);
    }
  }

  // TODO check logic
  public async getChangesUntil(height: string) {
    await this.loadHistoryUntil(height);
    const result: EntityChanges[] = [];
    let heightCopy: string = height;

    for (
      ;
      new BigNumber(heightCopy).isLessThanOrEqualTo(this.currentVersion);

    ) {
      const oneHistory = this.getHistoryByVersion(heightCopy);
      heightCopy = new BigNumber(heightCopy).plus(1).toFixed();

      if (oneHistory) {
        result.push(...oneHistory);
      }
    }
    return result;
  }

  private clearHistoryBefore(height: string) {
    const minVersionGreaterOrEqualToHeight = new BigNumber(
      this.minVersion
    ).isGreaterThanOrEqualTo(height);
    const currentVersionSmallerThanHeight = new BigNumber(
      this.currentVersion
    ).isLessThan(height);

    if (
      !(minVersionGreaterOrEqualToHeight || currentVersionSmallerThanHeight)
    ) {
      let index: string = this.minVersion;

      for (
        ;
        new BigNumber(index).isLessThan(height);
        index = new BigNumber(index).plus(1).toFixed()
      ) {
        this.history.delete(index);
      }
      this.minVersion = height;
    }
  }

  public getUnconfirmedChanges() {
    return lodash.cloneDeep(this.unconfirmedChanges);
  }
  public getConfirmedChanges() {
    // TODO: performance optimization without cloneDeep?
    return lodash.cloneDeep(this.confirmedChanges);
  }

  get trackingEntities() {
    // unused?
    return this.allTrackingEntities.values();
  }

  get changesStack() {
    return this.isConfirming ? this.unconfirmedChanges : this.confirmedChanges;
  }

  get isConfirming() {
    return this.confirming;
  }

  public get historyVersion() {
    return {
      min: this.minVersion,
      max: this.currentVersion,
    };
  }
}
