import { SmartDB } from '../../packages/database-postgres/src/smartDB';
import { IBalance } from '../../packages/interfaces';
import { Balance } from '../../packages/database-postgres/entity/Balance';
import BigNumber from 'bignumber.js';
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
    const item = await this.sdb.get<Balance>(Balance, { address, currency });
    const balance = item ? item.balance : String(0);
    return new BigNumber(balance);
  }

  async increase(address: string, currency: string, amount) {
    if (new BigNumber(amount).eq(0)) return;
    const key = { address, currency };
    let item = await this.sdb.get<Balance>(Balance, key);
    if (item) {
      item.balance = new BigNumber(item.balance).plus(amount).toString(10);
      await global.app.sdb.update<Balance>(
        Balance,
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
