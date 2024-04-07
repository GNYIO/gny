import { ITransactionPool, UnconfirmedTransaction } from '@gnyio/interfaces';

export class TransactionPoolPersistent implements ITransactionPool {
  constructor() {}

  public add(trs: UnconfirmedTransaction) {}

  public remove(id: string) {}

  public has(id: string) {}

  public getUnconfirmed() {}

  public clear() {}

  public get(id: string) {}
}
