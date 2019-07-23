import { SmartDB } from '../../packages/database-postgres/src/smartDB';
import { IBalance } from '../interfaces';
import { Balance } from '../../packages/database-postgres/entity/Balance';

function getCurrencyFlag(currency: string) {
  if (currency === 'GNY') {
    return 1;
  } else if (currency.indexOf('.') !== -1) {
    // UIA
    return 2;
  }
  throw new Error('wrong currency type or flag');
}

export default class BalanceManager {
  private sdb: SmartDB;
  constructor(sdb: SmartDB) {
    this.sdb = sdb;
  }

  async get(address: string, currency: string) {
    const item: IBalance = await this.sdb.get('Balance', { address, currency });
    const balance = item ? item.balance : String(0);
    return new global.app.util.bignumber(balance);
  }

  async increase(address: string, currency: string, amount) {
    if (new global.app.util.bignumber(amount).eq(0)) return;
    const key = { address, currency };
    let item: IBalance = await this.sdb.get('Balance', key);
    if (item) {
      item.balance = new global.app.util.bignumber(item.balance)
        .plus(amount)
        .toString(10);
      await global.app.sdb.update(
        'Balance',
        { balance: String(item.balance) },
        key
      );
    } else {
      const newBalance: IBalance = {
        address,
        currency,
        balance: String(amount),
        flag: getCurrencyFlag(currency),
      };
      item = await this.sdb.create<Balance>(Balance, newBalance);
    }
  }

  async decrease(address: string, currency: string, amount) {
    await this.increase(address, currency, `-${amount}`);
  }

  async transfer(currency: string, amount, from: string, to: string) {
    await this.decrease(from, currency, amount);
    await this.increase(to, currency, amount);
  }
}
