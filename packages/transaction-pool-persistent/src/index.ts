import { ITransactionPool, UnconfirmedTransaction } from '@gnyio/interfaces';
import Sqlite from 'better-sqlite3';

const table1 = `

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT NOT NULL UNIQUE,
  type NUMBER NOT NULL,
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

  public add(trs: UnconfirmedTransaction) {}

  public remove(id: string) {}

  public has(id: string) {}

  public getUnconfirmed() {}

  public clear() {}

  public get(id: string) {}
}
