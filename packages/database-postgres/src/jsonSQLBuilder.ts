import { FieldTypes } from './fieldTypes';
import { deepCopy } from './codeContract';
import { isString, isArray, isNumber } from 'util';
const jsonSQL = require('json-sql')({
  separatedValues : false
});
import * as lodash from 'lodash';
import { ModelSchema } from './modelSchema';

export const MULTI_SQL_SEPARATOR = ';';
export enum SqlType {
  Schema = 0,
  Select = 1,
  Insert = 2,
  Update = 3,
  Delete = 4,
  Other = 9,
}

export class JsonSqlBuilder {

  getTableName(key) {
    return lodash.snakeCase(key) + 's';
  }

  getPrimaryKeyCondition(diagramModel, columnName) {
    return diagramModel.setPrimaryKey({}, columnName);
  }

  buildDropSchema(schema: ModelSchema) {
    return 'drop table "' + this.getTableName(schema.modelName) + '"';
  }

  buildSchema(schema: ModelSchema) {
    const t = new Array;
    const obj = Object.assign({
      type : 'create'
    }, deepCopy(schema.schemaObject));
    schema.jsonProperties.forEach(function(name) {
      return obj.tableFields.find(function(functionImport) {
        return functionImport.name === name;
      }).type = FieldTypes.Text;
    });
    obj.tableFields.filter(function(object) {
      return isString(object.unique);
    }).forEach(function(obj) {
      return Reflect.deleteProperty(obj, 'unique');
    });
    const a = jsonSQL.build(obj);
    t.push(a.query);
    const tableName = this.getTableName(schema.modelName);
    schema.indexes.forEach(function(f) {
      t.push(jsonSQL.build({
        type : 'index',
        table : tableName,
        name : tableName + '_' + f.name,
        indexOn : f.properties.join(',')
      }).query);
    });
    const transferArr = obj.tableFields.filter(function(studiesList) {
      return true === studiesList.unique;
    }).map(function(engineDiscovery) {
      return engineDiscovery.name;
    });
    const _eventQueue = schema.uniqueIndexes.filter(function(oldnode) {
      return !(1 === oldnode.properties.length && transferArr.some(function(canCreateDiscussions) {
        return canCreateDiscussions === oldnode.properties[0];
      }));
    });
    schema.isCompsiteKey && _eventQueue.push({
      name : 'composite_primary_key',
      properties : schema.compositeKeys
    });
    _eventQueue.forEach(function(f) {
      t.push(jsonSQL.build({
        type : 'unique',
        table : tableName,
        name : tableName + '_' + f.name,
        uniqueOn : f.properties.join(',')
      }).query);
    });
    return t;
  }

  buildInsert(args, key) {
    var i = {
      type : SqlType.Insert
    };
    return Object.assign(i, jsonSQL.build({
      type : 'insert',
      table : this.getTableName(args.modelName),
      values : this.replaceJsonFields(args, key)
    }));
  }

  buildDelete(args, params) {
    var i = {
      type : SqlType.Delete
    };
    return Object.assign(i, jsonSQL.build({
      type : 'remove',
      table : this.getTableName(args.modelName),
      condition : this.getPrimaryKeyCondition(args, params)
    }));
  }

  buildUpdate(args, environment, type, selector) {
    var tableName = this.getTableName(args.modelName);
    var func = this.getPrimaryKeyCondition(args, environment);
    func._version_ = selector;
    var a = {
      type : SqlType.Update
    };
    return Object.assign(a, jsonSQL.build({
      type : 'update',
      table : tableName,
      modifier : this.replaceJsonFields(args, type),
      condition : func
    }));
  }

  buildSelect(args, index, condition, size, object, fn) {
    var tableName = this.getTableName(args.modelName);
    var options = undefined;
    if (isArray(index)) {
      var result = index || args.properties.map(function(canCreateDiscussions) {
        return args.schemaObject.table + '.' + canCreateDiscussions;
      });
      var query = isNumber(size) ? {
        limit : size
      } : size || {};
      var obj = object || {};
      /** @type {boolean} */
      var _iteratorNormalCompletion3 = true;
      /** @type {boolean} */
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;
      try {
        var _iterator3 = Reflect.ownKeys(obj)[Symbol.iterator]();
        var $__6;
        for (; !(_iteratorNormalCompletion3 = ($__6 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var item = $__6.value;
          var order = obj[item] || -1;
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
        type : 'select',
        table : tableName,
        fields : result,
        condition : condition,
        limit : query.limit,
        offset : query.offset,
        sort : obj,
        join : fn
      };
    } else {
      /** @type {!Function} */
      var show = index;
      /** @type {!Object} */
      options = Object.assign({
        type : 'select',
        table : tableName
      }, show);
    }
    var static_events = {
      type : SqlType.Select
    };
    return Object.assign(static_events, jsonSQL.build(options));
  }

  replaceJsonFields(schema: ModelSchema, options) {
    if (0 === schema.jsonProperties.length) {
      return options;
    }
    const extractedTargets = Object.assign({}, options);
    schema.jsonProperties.forEach(function(target) {
      if (Reflect.has(options, target)) {
        /** @type {string} */
        extractedTargets[target] = JSON.stringify(options[target]);
      }
    });
    return extractedTargets;
  }
}
