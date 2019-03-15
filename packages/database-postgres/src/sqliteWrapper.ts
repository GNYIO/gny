import { promisify } from 'util';
import { LogManager } from './logger';
import betterSqlite3 from 'better-sqlite3';

export class SqliteWrapper {

  constructor() {
    this.log = LogManager.getLogger("SqliteWrapper");
  }
  open(options, cb) {
    var result = {
      err : null,
      result : true
    };
    try {
      this.db = new betterSqlite3(options);
      this.log.trace("SUCCESS open ( db = " + options + " )");
    } catch (err) {
      if (result = {
        err : err,
        result : false
      }, this.log.error("FAILD open ( db = " + options + " )", err), !cb) {
        throw err;
      }
    }
    cb && cb(result.err, result.result);
    return result.result;
  }

  async asynOpen(inputdir) {
    return promisify(this.open).call(this, inputdir);
  }

  close(cb) {
    var result = {
      err : null,
      result : true
    };
    try {
      if (this.db && this.isConnected) {
        this.db.close();
        this.log.trace("SUCCESS close");
      } else {
        this.log.info("closed already");
      }
    } catch (err) {
      if (result = {
        err : err,
        result : false
      }, this.log.error("FAILD close", err), !cb) {
        throw err;
      }
    }
    cb && cb(result.err, result.result);
    return result.result;
  }

  asynClose() {
    return promisify(this.close).call(this);
  }

  execute(db, module, cb) {
    var response = {
      err : null,
      result : {
        lastInsertRowId : "0",
        rowsEffected : 0
      }
    };
    try {
      var info = this.db.prepare(db).run(module || []);
      response.result = {
        lastInsertRowId : info.lastInsertROWID.toString(),
        rowsEffected : info.changes
      };

      this.log.trace("SUCCESS execute sql = " + db + " param = " + JSON.stringify(module) + ", effected = " + response.result.rowsEffected);
    } catch (err) {
      if (response.err = err, this.log.error("FAILD execute sql = " + db + " param = " + JSON.stringify(module), err), !cb) {
        throw err;
      }
    }
    cb && cb(response.err, response.result);
    return response.result;
  }

  query(query, args, cb) {
    var response = {
      err : null,
      result : new Array
    };
    try {
      response.result = this.db.prepare(query).all(args || []);
      this.log.trace("SUCCESS query sql = " + query + " param = " + JSON.stringify(args) + ", result count = " + response.result.length);
    } catch (err) {
      if (response.err = err, this.log.error("FAILD query sql = " + query + " param = " + JSON.stringify(args), err), !cb) {
        throw err;
      }
    }
    cb && cb(response.err, response.result);
    return response.result;
  }

  executeBatch(row, on, callback) {
    var s = undefined;
    var result = {
      err : null,
      result : new Array
    };
    try {
      row.forEach((data) => {
        /** @type {!Object} */
        s = data;
        var divCategory = this.execute(data.query, data.parameters);
        if (on) {
          on(divCategory, data);
        }
        result.result.push(divCategory);
      });
    } catch (err) {
      if (result.err = err, this.log.error("FAILD executeBatch, sql = " + s.query + " param = " + JSON.stringify(s.parameters), err), !callback) {
        throw err;
      }
    }
    callback && callback(result.err, result.result);
    return result.result;
  }

  async asynExecute(providers, url) {
    return promisify(this.execute).call(this, providers, url);
  }

  async asynQuery(providers, url) {
    return promisify(this.query).call(this, providers, url);
  }

  asyncExecuteBatch(providers, url) {
    return promisify(this.executeBatch).call(this, providers, url);
  }

  get isConnected() {
    return this.db.open;
  }
}
