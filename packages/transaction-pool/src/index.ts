import { ITransactionPool, UnconfirmedTransaction } from '@gny/interfaces';

export class TransactionPool implements ITransactionPool {
  private index: Map<string, number>;
  private unConfirmed: Array<UnconfirmedTransaction | undefined>;
  constructor() {
    this.index = new Map();
    this.unConfirmed = [];
  }

  public add(trs: UnconfirmedTransaction) {
    this.unConfirmed.push(trs);
    this.index.set(trs.id, this.unConfirmed.length - 1);
  }

  public remove(id: string) {
    const pos = this.index.get(id);
    if (typeof pos === 'number') {
      this.index.delete(id);
      this.unConfirmed[pos] = undefined;
    }
  }

  public has(id: string) {
    const pos = this.index.get(id);
    return pos !== undefined && !!this.unConfirmed[pos];
  }

  public getUnconfirmed() {
    const a: Array<UnconfirmedTransaction | undefined> = [];

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
    if (typeof pos === 'number') {
      return this.unConfirmed[pos];
    }
    return undefined;
  }
}
