
export default class AutoIncrement {
  sdb: any;
  constructor(sdb) {
    this.sdb = sdb;
  }

  async get(key) {
    const item = await this.sdb.get('Variable', key);
    const value = item ? item.value : '0';
    return value;
  }

  async increment(key) {
    let item = await this.sdb.get('Variable', key);
    if (item) {
      item.value = global.app.util.bignumber(item.value).plus(1).toString();
      await this.sdb.update('Variable', { value: item.value }, key);
    } else {
      item = await this.sdb.create('Variable', { key, value: '1' });
    }
    return item.value;
  }
}