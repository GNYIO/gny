import { isArray, isNumber } from 'util';

import sq from '@gny/json-sql';
const jsonSQL = sq({
  separatedValues: false,
});
import lodash from 'lodash';
import { ModelSchema } from './modelSchema.js';
import { ObjectLiteral } from 'typeorm';

export const MULTI_SQL_SEPARATOR = ';';
export enum SqlType {
  Schema = 0,
  Select = 1,
  Insert = 2,
  Update = 3,
  Delete = 4,
  Other = 9,
}

export type SqlParameters = Array<any> | ObjectLiteral;

export type SqlAndParameters = {
  type: SqlType;
  query: string;
  parameters?: SqlParameters;
  expectEffected?: boolean;
};

export class JsonSqlBuilder {
  private getTableName(key: string) {
    return lodash.lowerCase(key).replace(' ', '_');
  }

  private getPrimaryKeyCondition(schema: ModelSchema, columnName) {
    return schema.setPrimaryKey({}, columnName);
  }

  public buildInsert(schema: ModelSchema, fieldValues: ObjectLiteral) {
    const i = {
      type: SqlType.Insert,
    };
    const result: SqlAndParameters = Object.assign(
      i,
      jsonSQL.build({
        type: 'insert',
        table: this.getTableName(schema.modelName),
        values: this.replaceJsonFields(schema, fieldValues),
      })
    );
    return result;
  }

  public buildDelete(schema: ModelSchema, primarykey: ObjectLiteral) {
    const i = {
      type: SqlType.Delete,
    };
    const result: SqlAndParameters = Object.assign(
      i,
      jsonSQL.build({
        type: 'remove',
        table: this.getTableName(schema.modelName),
        condition: this.getPrimaryKeyCondition(schema, primarykey),
      })
    );
    return result;
  }

  public buildUpdate(
    schema: ModelSchema,
    primaryKey: ObjectLiteral,
    fieldValues: ObjectLiteral,
    version: number
  ) {
    const tableName = this.getTableName(schema.modelName);
    const obj = this.getPrimaryKeyCondition(schema, primaryKey);
    obj._version_ = version;
    const a = {
      type: SqlType.Update,
    };
    const result: SqlAndParameters = Object.assign(
      a,
      jsonSQL.build({
        type: 'update',
        table: tableName,
        modifier: this.replaceJsonFields(schema, fieldValues),
        condition: obj,
      })
    );
    return result;
  }

  public buildSelect(
    schema: ModelSchema,
    fields: string[] | ObjectLiteral,
    where?: ObjectLiteral,
    resultRange?: any,
    sort?: any,
    join?: any
  ) {
    const tableName = this.getTableName(schema.modelName);
    let options = undefined;
    if (isArray(fields)) {
      const result =
        fields ||
        schema.properties.map(function(one) {
          // @ts-ignore
          return schema.schemaObject.table + '.' + one;
        });
      const query = isNumber(resultRange)
        ? {
            limit: resultRange,
          }
        : resultRange || {};
      const obj = sort || {};
      /** @type {boolean} */
      let _iteratorNormalCompletion3 = true;
      /** @type {boolean} */
      let _didIteratorError3 = false;
      let _iteratorError3 = undefined;
      let _iterator3 = undefined;
      try {
        _iterator3 = Reflect.ownKeys(obj)[Symbol.iterator]();
        let $__6;
        for (
          ;
          !(_iteratorNormalCompletion3 = ($__6 = _iterator3.next()).done);
          _iteratorNormalCompletion3 = true
        ) {
          const item = $__6.value;
          const order = obj[item] || -1;
          obj[item] = 'ASC' === order ? 1 : 'DESC' === order ? -1 : order;
        }
      } catch (err) {
        /** @type {boolean} */
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
      options = {
        type: 'select',
        table: tableName,
        fields: result,
        condition: where,
        limit: query.limit,
        offset: query.offset,
        sort: obj,
        join: join,
      };
    } else {
      const show = fields;
      options = Object.assign(
        {
          type: 'select',
          table: tableName,
        },
        show
      );
    }
    const static_events = {
      type: SqlType.Select,
    };
    const result: SqlAndParameters = Object.assign(
      static_events,
      jsonSQL.build(options)
    );
    return result;
  }

  private replaceJsonFields(schema: ModelSchema, options) {
    if (0 === schema.jsonProperties.length) {
      return options;
    }
    const extractedTargets = Object.assign({}, options);
    schema.jsonProperties.forEach(function(target) {
      if (Reflect.has(options, target)) {
        extractedTargets[target] = JSON.stringify(options[target]);
      }
    });
    return extractedTargets;
  }
}
