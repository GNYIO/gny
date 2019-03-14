const codeContract = require('./codeContract');
const enumerations = require('./entityChangeType');

class BasicTrackerSqlBuilder {
  /**
   * @param {?} data
   * @param {string} schemas
   * @param {?} options
   * @return {undefined}
   */
  constructor(data, schemas, options) {
    this.tracker = data;
    this.schemas = schemas;
    this.sqlBuilder = options;
  }


  buildChangeSqls() {
    return this.tracker.getConfimedChanges().map((change) => {
      return this.buildSqlAndParameters(this.schemas.get(change.model), change.primaryKey, change);
    });
  }
  
  async buildRollbackChangeSqls(historyVersion) {
    var array = [];
    var incoming_value = await this.tracker.getChangesUntil(historyVersion);
    var definition = undefined;
    for (; undefined !== (definition = incoming_value.pop());) {
      var loadAllArticles = this.schemas.get(definition.model);
      array.push(this.buildRollbackSqlAndParameters(loadAllArticles, definition.primaryKey, definition));
    }
    return array;
  }

  buildSqlAndParameters(speed, count, data) {
    var result = BasicTrackerSqlBuilder.fieldValuesFromChanges(data);
    switch(result[enumerations.ENTITY_VERSION_PROPERTY] = data.dbVersion, data.type) {
      case enumerations.EntityChangeType.New:
        return this.sqlBuilder.buildInsert(speed, result);
      case enumerations.EntityChangeType.Modify:
        return this.sqlBuilder.buildUpdate(speed, count, result, data.dbVersion - 1);
      case enumerations.EntityChangeType.Delete:
        return this.sqlBuilder.buildDelete(speed, count);
      default:
        throw new Error("Invalid EntityChangeType '" + data.type + "'");
    }
  }


  buildRollbackSqlAndParameters(fn, delay, params) {
    var requests = BasicTrackerSqlBuilder.fieldValuesFromChanges(params, true);
    switch(params.type) {
      case enumerations.EntityChangeType.New:
        return this.sqlBuilder.buildDelete(fn, delay);
      case enumerations.EntityChangeType.Modify: {
        // TODO: check
        requests[enumerations.ENTITY_VERSION_PROPERTY] = params.dbVersion - 1;
        return this.sqlBuilder.buildUpdate(fn, delay, requests, params.dbVersion);
      }
      case enumerations.EntityChangeType.Delete:
        return this.sqlBuilder.buildInsert(fn, requests);
      default:
        throw new Error("Invalid EntityChangeType '" + params.type + "'");
    }
  }


  get entityTracker() {
    return this.tracker;
  }

  static fieldValuesFromChanges(value) {
    var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    return t ? codeContract.makeJsonObject(value.propertyChanges, function(engineDiscovery) {
      return engineDiscovery.name;
    }, function(vOffset) {
      return vOffset.original;
    }) : codeContract.makeJsonObject(value.propertyChanges, function(engineDiscovery) {
      return engineDiscovery.name;
    }, function($tour) {
      return $tour.current;
    });
  }
}

module.exports = {
  BasicTrackerSqlBuilder,
}
