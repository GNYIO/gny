import { ITransactionPool, UnconfirmedTransaction } from '@gnyio/interfaces';
import Sqlite from 'better-sqlite3';

const table1 = `

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT NOT NULL UNIQUE,
  type INT NOT NULL,
  timestamp INT NOT NULL,
  senderId TEXT NOT NULL,
  senderPublicKey TEXT NOT NULL,
  fee TEXT NOT NULL,
  signatures TEXT NOT NULL,
  secondSignature TEXT NULL, -- nullable
  args TEXT NOT NULL,
  message TEXT NULL,         -- nullable
  -- _version_ INT NULL,
  PRIMARY KEY (id)
) STRICT;
`;

function cleanUp(result: any) {
  if (typeof result.args === 'string') {
    result.args = JSON.parse(result.args);
  }

  if (result.message === null) {
    result.message = undefined;
  }

  if (result.secondSignature === null) {
    delete result.secondSignature;
  }

  return result;
}

export class TransactionPoolPersistent implements ITransactionPool {
  private db!: Sqlite.Database;

  // path: either a path to a sqlite3 file or ":memory:"
  constructor(path: string) {
    this.db = new Sqlite(path, {
      readonly: false,
      fileMustExist: false,
      timeout: 5000,
      // verbose: (x) => console.log(`[SQL] ${x}`),
    });

    this.db.pragma('journal_mode = WAL');

    // configure bigint
    // https://github.com/WiseLibs/better-sqlite3/blob/master/docs/integer.md#the-bigint-primitive-type
    this.db.defaultSafeIntegers(false); // Numbers by default

    this.db.exec(table1);
  }

  public add(trs: UnconfirmedTransaction) {
    try {
      this.db
        .prepare(
          `
        INSERT INTO transactions (id, type, timestamp, senderId, senderPublicKey, fee, signatures, secondSignature, args, message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `
        )
        .run(
          trs.id,
          trs.type,
          trs.timestamp,
          trs.senderId,
          trs.senderPublicKey,
          trs.fee,
          trs.signatures,
          trs.secondSignature,
          JSON.stringify(trs.args),
          trs.message
        );
    } catch (err) {
      console.log(err);
    }
  }

  public remove(id: string) {
    const result = this.db
      .prepare(
        `
      DELETE FROM transactions
      WHERE id = ?;
    `
      )
      .run(id);

    // if (result.changes !== 1) {
    //   throw new Error('SQLITE not exactly 1 row updated');
    // }
  }

  public has(id: string) {
    interface ZeroOrOne {
      result: 0 | 1;
    }

    // https://stackoverflow.com/questions/9755860/valid-query-to-check-if-row-exists-in-sqlite3
    const raw = this.db
      .prepare(
        `
      SELECT EXISTS(
        SELECT 1 FROM transactions
        WHERE id = ?
      ) as result;
    `
      )
      .get(id) as ZeroOrOne;

    if (raw.result === 1) {
      return true;
    } else {
      return false;
    }
  }

  public getUnconfirmed() {
    const temp = this.db
      .prepare(
        `
      SELECT *
      FROM transactions;
    `
      )
      .all() as UnconfirmedTransaction[];

    const result = temp.map(x => cleanUp(x));
    return result;
  }

  public clear() {
    this.db
      .prepare(
        `
      DELETE FROM transactions;
    `
      )
      .run();
  }

  public get(id: string) {
    const temp = this.db
      .prepare(
        `
      SELECT *
      FROM transactions
      WHERE id = ?;
    `
      )
      .get(id) as UnconfirmedTransaction;

    if (temp === undefined) {
      return undefined;
    }

    const result = cleanUp(temp);

    return result;
  }
}
