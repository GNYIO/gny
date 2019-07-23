import * as CodeContract from './codeContract';
import * as enumerations from './entityChangeType';
import { BasicEntityTracker, EntityChanges } from './basicEntityTracker';
import { ModelSchema } from './modelSchema';
import { JsonSqlBuilder, SqlAndParameters } from './jsonSQLBuilder';
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
  constructor(
    basicEntityTracker: BasicEntityTracker,
    schemas: Map<string, ModelSchema>,
    sqlBuilder: JsonSqlBuilder
  ) {
    this.tracker = basicEntityTracker;
    this.schemas = schemas;
    this.sqlBuilder = sqlBuilder;
  }

  public buildChangeSqls() {
    return this.tracker.getConfirmedChanges().map(oneChange => {
      const schema = this.schemas.get(oneChange.model);
      const primaryKey = oneChange.primaryKey;
      return this.buildSqlAndParameters(schema, primaryKey, oneChange);
    });
  }

  public async buildRollbackChangeSqls(height: string) {
    const result: SqlAndParameters[] = [];
    const changesUntil = await this.tracker.getChangesUntil(height);
    let one: EntityChanges = undefined;
    for (; undefined !== (one = changesUntil.pop()); ) {
      const schema = this.schemas.get(one.model);
      const sql = this.buildRollbackSqlAndParameters(
        schema,
        one.primaryKey,
        one
      );
      result.push(sql);
    }
    return result;
  }

  private buildSqlAndParameters(
    schema: ModelSchema,
    primaryKey: ObjectLiteral,
    data: EntityChanges
  ) {
    const result = BasicTrackerSqlBuilder.fieldValuesFromChanges(data);
    result[enumerations.ENTITY_VERSION_PROPERTY] = data.dbVersion;
    switch (data.type) {
      case enumerations.EntityChangeType.New:
        return this.sqlBuilder.buildInsert(schema, result);
      case enumerations.EntityChangeType.Modify:
        return this.sqlBuilder.buildUpdate(
          schema,
          primaryKey,
          result,
          data.dbVersion - 1
        );
      case enumerations.EntityChangeType.Delete:
        return this.sqlBuilder.buildDelete(schema, primaryKey);
      default:
        throw new Error("Invalid EntityChangeType '" + data.type + "'");
    }
  }

  private buildRollbackSqlAndParameters(
    schema: ModelSchema,
    delay: ObjectLiteral,
    entityChanges: EntityChanges
  ) {
    const requests = BasicTrackerSqlBuilder.fieldValuesFromChanges(
      entityChanges,
      true
    );
    switch (entityChanges.type) {
      case enumerations.EntityChangeType.New:
        return this.sqlBuilder.buildDelete(schema, delay);
      case enumerations.EntityChangeType.Modify: {
        // TODO: check
        requests[enumerations.ENTITY_VERSION_PROPERTY] =
          entityChanges.dbVersion - 1;
        return this.sqlBuilder.buildUpdate(
          schema,
          delay,
          requests,
          entityChanges.dbVersion
        );
      }
      case enumerations.EntityChangeType.Delete:
        return this.sqlBuilder.buildInsert(schema, requests);
      default:
        throw new Error(
          "Invalid EntityChangeType '" + entityChanges.type + "'"
        );
    }
  }

  get entityTracker() {
    return this.tracker;
  }

  private static fieldValuesFromChanges(
    entityChanges: EntityChanges,
    option = false
  ) {
    if (option) {
      return CodeContract.makeJsonObject(
        entityChanges.propertyChanges,
        one => one.name,
        one => one.original
      );
    } else {
      return CodeContract.makeJsonObject(
        entityChanges.propertyChanges,
        one => one.name,
        one => one.current
      );
    }
  }
}
