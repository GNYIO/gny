import { ITransaction, ITransactionPool } from '@gny/interfaces';

export class TransactionPool implements ITransactionPool {
  private index: Map<string, number>;
  private unConfirmed: ITransaction[];
  constructor() {
    this.index = new Map();
    this.unConfirmed = [];
  }

  public add(trs: ITransaction) {
    this.unConfirmed.push(trs);
    this.index.set(trs.id, this.unConfirmed.length - 1);
  }

  public remove(id: string) {
    const pos = this.index.get(id);
    this.index.delete(id);
    this.unConfirmed[pos] = null;
  }

  public has(id: string) {
    const pos = this.index.get(id);
    return pos !== undefined && !!this.unConfirmed[pos];
  }

  public getUnconfirmed() {
    const a: ITransaction[] = [];

    for (let i = 0; i < this.unConfirmed.length; i++) {
      if (this.unConfirmed[i]) {
        a.push(this.unConfirmed[i]);
      }
    }
    return a;
  }

  public clear() {
    this.index = new Map<string, number>();
    this.unConfirmed = [];
  }

  public get(id: string) {
    const pos = this.index.get(id);
    return this.unConfirmed[pos];
  }
}
