
function getCurrencyFlag(currency) {
  if (currency === 'GNY') {
    return 1;
  } else if (currency.indexOf('.') !== -1) {
    // UIA
    return 2;
  }
  throw new Error('wrong currency type or flag');
}

export default class BalanceManager {
  constructor(sdb) {
    this.sdb = sdb;
  }

  async get(address, currency) {
    const item = await this.sdb.get('Balance', { address, currency });
    const balance = item ? item.balance : '0';
    return new global.app.util.bignumber(balance);
  }

  async increase(address, currency, amount) {
    if (new global.app.util.bignumber(amount).eq(0)) return;
    const key = { address, currency };
    let item = await this.sdb.get('Balance', key);
    if (item) {
      item.balance = new global.app.util.bignumber(item.balance).plus(amount).toString(10);
      await global.app.sdb.update('Balance', { balance: item.balance }, key);
    } else {
      item = await this.sdb.create('Balance', {
        address,
        currency,
        balance: amount,
        flag: getCurrencyFlag(currency),
      });
    }
  }

  async decrease(address, currency, amount) {
    await this.increase(address, currency, `-${amount}`);
  }

  async transfer(currency, amount, from, to) {
    await this.decrease(from, currency, amount);
    await this.increase(to, currency, amount);
  }
}