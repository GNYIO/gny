import { SqliteWrapper } from './sqliteWrapper';
import { MULTI_SQL_SEPARATOR } from './jsonSQLBuilder';

class DBTransaction {
  /**
   * @param {!Object} connection
   * @return {undefined}
   */
  constructor(connection) {
    this.connection = connection;
  }
  async commit() {
    await this.connection.execute("COMMIT;");
  }

  async rollback() {
    await this.connection.execute("ROLLBACK;");
  }
}

export class SqliteConnection {
  /**
   * @param {!Object} opts
   * @return {undefined}
   */
  constructor(opts) {
    this.options = opts;
    this.sqlite = new SqliteWrapper;
  }

  async connect() {
    return this.sqlite.asynOpen(this.options.storage);
  }

  async disconnect() {
    return await this.sqlite.asynClose();
  }

  async query(e, exceptionLevel) {
    return await this.sqlite.asynQuery(e, exceptionLevel);
  }

  querySync(query, params) {
    return this.sqlite.query(query, params);
  }

  ensureExecuteEffected(event) {
    if (0 === event.rowsEffected) {
      throw new Error("None row effected");
    }
  }

  executeBatchSync(next) {
    return this.sqlite.executeBatch(next || [], this.ensureExecuteEffected);
  }

  async executeBatch(next) {
    return await this.sqlite.asyncExecuteBatch(next || [], this.ensureExecuteEffected);
  }

  executeSync(next, user) {
    var e = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var t = this.sqlite.execute(next, user);
    e && this.ensureExecuteEffected(t);
    return t;
  }

  async execute(hash, params) {
    var e = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var t = await this.sqlite.asynExecute(hash, params);
    e && this.ensureExecuteEffected(t);
    return t;
  }

  async runScript(gnNcWms) {
    gnNcWms.split(MULTI_SQL_SEPARATOR).forEach(async (selectQuery) => {
      return await ("" !== selectQuery.trim()) && this.sqlite.execute(selectQuery, []);
    });
  }

  async beginTrans() {
    await this.execute("BEGIN TRANSACTION;");
    return new DBTransaction(this);
  }

  get connectionOptions() {
    return this.options;
  }

  get isConnected() {
    return this.sqlite.isConnected;
  }
}
