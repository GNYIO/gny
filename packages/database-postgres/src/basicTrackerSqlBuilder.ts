import * as codeContract from './codeContract';
import * as enumerations from './entityChangeType';
import { BasicEntityTracker, EntityChanges } from './basicEntityTracker';
import { ModelSchema } from './modelSchema';
import { JsonSqlBuilder } from './jsonSQLBuilder';
import { ObjectLiteral } from 'typeorm';

export class BasicTrackerSqlBuilder {
  private tracker: BasicEntityTracker;
  private schemas: Map<string, ModelSchema>;
  private sqlBuilder: JsonSqlBuilder;

  /**
   * @constructor
   * @param {?} basicEntityTracker
   * @param {string} schemas
   * @param {?} sqlBuilder
   * @return {undefined}
   */
  constructor(basicEntityTracker: BasicEntityTracker, schemas: Map<string, ModelSchema>, sqlBuilder: JsonSqlBuilder) {
    this.tracker = basicEntityTracker;
    this.schemas = schemas;
    this.sqlBuilder = sqlBuilder;
  }

  public buildChangeSqls() {
    return this.tracker.getConfimedChanges().map((oneChange) => {
      const schema = this.schemas.get(oneChange.model);
      const primaryKey = oneChange.primaryKey;
      return this.buildSqlAndParameters(schema, primaryKey, oneChange);
    });
  }

  async buildRollbackChangeSqls(height: number) {
    const result = [];
    const changesUntil = await this.tracker.getChangesUntil(height);
    let one = undefined;
    for (; undefined !== (one = changesUntil.pop());) {
      const schema = this.schemas.get(one.model);
      const sql = this.buildRollbackSqlAndParameters(schema, one.primaryKey, one);
      result.push(sql);
    }
    return result;
  }

  private buildSqlAndParameters(schema: ModelSchema, primaryKey: ObjectLiteral, data: EntityChanges) {
    const result = BasicTrackerSqlBuilder.fieldValuesFromChanges(data);
    result[enumerations.ENTITY_VERSION_PROPERTY] = data.dbVersion;
    switch (data.type) {
      case enumerations.EntityChangeType.New:
        return this.sqlBuilder.buildInsert(schema, result);
      case enumerations.EntityChangeType.Modify:
        return this.sqlBuilder.buildUpdate(schema, primaryKey, result, data.dbVersion - 1);
      case enumerations.EntityChangeType.Delete:
        return this.sqlBuilder.buildDelete(schema, primaryKey);
      default:
        throw new Error("Invalid EntityChangeType '" + data.type + "'");
    }
  }


  buildRollbackSqlAndParameters(fn, delay, params) {
    const requests = BasicTrackerSqlBuilder.fieldValuesFromChanges(params, true);
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
    const t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
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
