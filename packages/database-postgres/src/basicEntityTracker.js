const codeContractXX = require('./codeContract');
const enumerations = require('./entityChangeType');
const { isFunction } = require('util');
const lodash = require('lodash');
const { toArray, } = require('./helpers/index');

class BasicEntityTracker {
  /**
   * @param {string} sessionCache
   * @param {string} schemas
   * @param {number} message
   * @param {!Object} logger
   * @param {?} historyChanges
   */
  constructor(sessionCache, schemas, message, logger, historyChanges) {
    this.log = logger;
    this.cache = sessionCache;
    this.confirming = false;
    this.schemas = schemas;
    this.doLoadHistory = historyChanges;
    this.history = new Map;
    this.allTrackingEntities = new Map;
    this.unconfirmedChanges = new Array;
    this.confirmedChanges = new Array;
    this.minVersion = -1;
    this.currentVersion = -1;
    this.maxHistoryVersionsHold = message;
  }

  async loadHistory (klass, klasses) {
    return isFunction(this.doLoadHistory) ? await this.doLoadHistory(klass, klasses) : new Map;
  }

  async initVersion(version) {
    if (-1 === this.currentVersion) {
      var artistTrack = await this.loadHistory(version, version);
      this.attachHistory(artistTrack);
    }
  }
  
  makeModelAndKey(schema, key) {
    var b = {
      m : schema.modelName,
      k : key
    };
    return JSON.stringify(b);
  }

  splitModelAndKey(modelAndKey) {
    var params = JSON.parse(modelAndKey);
    return {
      model : params.m,
      key : params.k
    };
  }

  isTracking(schema, key) {
    var uniqueSchemaKeyString = this.makeModelAndKey(schema, key);
    return this.allTrackingEntities.has(uniqueSchemaKeyString);
  }


  getConfimedChanges() {
    return this.confirmedChanges;
  }

  buildTrackingEntity(index, isSlidingUp, $cont) {
    return isSlidingUp;
  }

  ensureNotracking(type, value) {
    if (undefined !== this.getTrackingEntity(type, value)) {
      throw Error("Entity (model='" + type.modelName + "', key='" + JSON.stringify(value) + "') is tracking already");
    }
  }

  getTracking(schema, version) {
    var info = this.getTrackingEntity(schema, version);
    if (undefined === info) {
      throw Error("Entity (model='" + schema.modelName + "', key='" + JSON.stringify(version) + "') is not tracking");
    }
    return info;
  }

  trackNew(schema, entity) {
    var val = schema.getNormalizedPrimaryKey(entity); // val = primaryKey
    this.ensureNotracking(schema, val);
    var data = lodash.cloneDeep(entity);
    schema.setDefaultValues(data);
    /** @type {number} */
    data[enumerations.ENTITY_VERSION_PROPERTY] = 1;
    var options = this.buildTrackingEntity(schema, data, enumerations.EntityState.New);
    this.cache.put(schema.modelName, val, options);
    this.changesStack.push(this.buildCreateChanges(schema, data));
    return options;
  }


  trackPersistent(schema, entity) {
    var val = schema.getNormalizedPrimaryKey(entity);
    this.ensureNotracking(schema, val);
    var keyReads = lodash.cloneDeep(entity);
    var data = this.buildTrackingEntity(schema, keyReads, enumerations.EntityState.Persistent);
    this.cache.put(schema.modelName, val, data);
    return data;
  }


  trackDelete(schema, trackingEntity) {
    this.changesStack.push(this.buildDeleteChanges(schema, trackingEntity, trackingEntity._version_));
    this.cache.evit(schema.modelName, schema.getNormalizedPrimaryKey(trackingEntity));
  }

  trackModify(schema, trackingEntity, modifier) {
    var result = Object.keys(modifier).filter(function(attr) {
      return schema.isValidProperty(attr) && attr !== enumerations.ENTITY_VERSION_PROPERTY && !lodash.isEqual(trackingEntity[attr], modifier[attr]);
    }).map(function(region) {
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

  getTrackingEntity(schema, key) {
    var result = schema.resolveKey(key);
    if (undefined !== result) {
      return result.isPrimaryKey ? this.cache.get(schema.modelName, result.key) : this.cache.getUnique(schema.modelName, result.uniqueName, result.key);
    }
  }

  acceptChanges(historyVersionNr) {
    this.log.trace("BEGIN acceptChanges Version = " + historyVersionNr);

    this.history.set(historyVersionNr, this.confirmedChanges);
    this.confirmedChanges = new Array;
    this.removeExpiredHistory();
    this.allTrackingEntities.clear();
    this.minVersion = -1 === this.minVersion ? historyVersionNr : this.minVersion;
    /** @type {number} */
    this.currentVersion = historyVersionNr;

    this.log.trace("SUCCESS acceptChanges Version = " + historyVersionNr);
  }

  buildCreateChanges(schema, obj) {
    var result = new Array;
    var key;
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
    };
  }

  buildModifyChanges(schema, currentObj, changes, version) {
    var results = new Array; // []
    changes.forEach(function(data) {
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
    };
  }

  buildDeleteChanges(schema, value, version) {
    var prev = new Array;
    var name;
    for (name in value) {
      if (schema.isValidProperty(name)) {
        prev.push({
          name : name,
          original : value[name]
        });
      }
    }
    return {
      type : enumerations.EntityChangeType.Delete,
      model : schema.modelName,
      primaryKey : schema.getNormalizedPrimaryKey(value),
      dbVersion : version,
      propertyChanges : prev
    };
  }

  undoEntityChanges(update) {
    switch(update.type) {
      case enumerations.EntityChangeType.New:
        if (this.cache.get(update.model, update.primaryKey)) {
          this.cache.evit(update.model, update.primaryKey);
        }
        break;
      case enumerations.EntityChangeType.Modify:
        var data = update.propertyChanges.map(function(association) {
          return {
            name : association.name,
            value : association.original
          };
        });
        this.cache.refreshCached(update.model, update.primaryKey, data);
        break;
      case enumerations.EntityChangeType.Delete:
        var elementCssSelector = codeContractXX.makeJsonObject(update.propertyChanges, function(engineDiscovery) {
          return engineDiscovery.name;
        }, function(vOffset) {
          return vOffset.original;
        });
        var facetsMap = this.schemas.get(update.model);
        var _a = this.buildTrackingEntity(facetsMap, elementCssSelector, enumerations.EntityState.Persistent);
        this.trackPersistent(facetsMap, _a);
    }
  }


  undoChanges(width) {
    var artistTrack = undefined;
    for (; undefined !== (artistTrack = width.pop());) {
      this.undoEntityChanges(artistTrack);
    }
  }

  rejectChanges() {
    this.cancelConfirm();
    this.undoChanges(this.confirmedChanges);
  }


  async rollbackChanges(toBlockHeight) {
    if (toBlockHeight > this.currentVersion) {
      return;
    }
    var url = this.currentVersion;
    this.log.trace("BEGIN rollbackChanges Version : " + url);

    await this.loadHistoryUntil(toBlockHeight);
    for (; this.currentVersion >= toBlockHeight;) {
      var artistTrack = this.getHistoryByVersion(this.currentVersion);
      this.undoChanges(artistTrack);
      this.currentVersion--;
    }
    /** @type {number} */
    this.minVersion = Math.min(this.minVersion, this.currentVersion);

    this.log.trace("SUCCESS rollbackChanges Version : " + url + " -> " + this.currentVersion);
  }


  beginConfirm() {
    this.confirming = true;
    if (this.unconfirmedChanges.length > 0) {
      this.log.warn("unconfimred changes(" + this.unconfirmedChanges.length + ") detected , you should call commit or cancel changes");
    }
    this.unconfirmedChanges = new Array;

    this.log.trace("BEGIN beginConfirm");
  }


  confirm() {
    var _selectedKeys;
    (_selectedKeys = this.confirmedChanges).push.apply(_selectedKeys, toArray(this.unconfirmedChanges));
    this.unconfirmedChanges = new Array;
    /** @type {boolean} */
    this.confirming = false;

    this.log.trace("SUCCESS confirm ");
  }


  cancelConfirm() {
    this.undoChanges(this.unconfirmedChanges);
    /** @type {boolean} */
    this.confirming = false;

    this.log.trace("SUCCESS cancelConfirm ");
  }


  attachHistory(data) {
    this.log.info("BEGIN attachHistory history version = " + JSON.stringify(this.historyVersion));

    data.forEach((ideaExample, data) => {
      this.history.set(data, ideaExample);
      this.minVersion = this.minVersion < 0 ? data : Math.min(data, this.minVersion);
      /** @type {number} */
      this.currentVersion = Math.max(data, this.currentVersion);
    });

    this.log.info("SUCCESS attachHistory size = " + JSON.stringify(data ? data.size : 0));
  }


  getHistoryByVersion(item) {
    var isSelectionByClickEnabled = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    !this.history.has(item) && isSelectionByClickEnabled && this.history.set(item, new Array);
    return this.history.get(item);
  }


  async loadHistoryUntil(height) {
    if (height < this.minVersion) {
      var artistTrack = await this.loadHistory(height, this.minVersion);
      this.attachHistory(artistTrack);
    }
  }


  removeExpiredHistory() {
    if (this.currentVersion - this.minVersion > this.maxHistoryVersionsHold) {
      this.clearHistoryBefore(this.currentVersion - this.maxHistoryVersionsHold);
    }
  }


  async getChangesUntil(historyVersionNr) {
    await this.loadHistoryUntil(historyVersionNr);
    var myHooks = new Array;
    var graphTypeBaseName = historyVersionNr;
    for (; graphTypeBaseName <= this.currentVersion;) {
      var fixedDims = this.getHistoryByVersion(graphTypeBaseName++);
      if (fixedDims) {
        myHooks.push.apply(myHooks, toArray(fixedDims));
      }
    }
    return myHooks;
  }


  clearHistoryBefore(height) {
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

module.exports = {
  BasicEntityTracker,
};
