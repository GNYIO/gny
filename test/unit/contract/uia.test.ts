import uia from '../../../src/contract/uia';
import BigNumber from 'bignumber.js';
import {
  ILogger,
  IAccount,
  IBlock,
  Transaction,
} from '../../../src/interfaces';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import BalanceManager from '../../../src/smartdb/balance-manager';
import address from '../../../src/utils/address';

jest.mock('../../../src/smartdb/balance-manager');
jest.mock('../../../packages/database-postgres/src/smartDB');

describe('uia', () => {
  beforeEach(done => {
    const logger: ILogger = {
      log: x => x,
      trace: x => x,
      debug: x => x,
      info: x => x,
      warn: x => x,
      error: x => x,
      fatal: x => x,
    };
    const sdb = new SmartDB(logger);

    global.app = {
      validate: jest.fn((type, value) => null),
      util: {
        address: address,
        bignumber: BigNumber,
      },
      sdb: sdb,
      balances: new BalanceManager(sdb),
    };
    done();
  });

  afterEach(done => {
    delete (uia as any).sender;
    delete (uia as any).block;
    delete (uia as any).trs;

    done();
  });

  describe('registerIssuer', () => {
    let name: string;
    let desc;

    afterEach(done => {
      delete (uia as any).sender;
      delete (uia as any).block;
      delete (uia as any).trs;

      name = undefined;
      desc = undefined;

      done();
    });

    it('should register the issuer', async done => {
      name = 'xpgeng';
      desc = { name: 'xpgeng' };
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: new BigNumber(100000000),
      } as IAccount;
      (uia as any).trs = {
        id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
        timestamp: 12165155,
      } as Transaction;

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.exists.mockReturnValue(null);
      global.app.sdb.create.mockReturnValue(null);

      const transfered = await uia.registerIssuer(name, desc);
      expect(transfered).toBeNull();
      done();
    });

    it('should return Invalid issuer name', async done => {
      name = '!@#xpgeng';

      const transfered = await uia.registerIssuer(name, desc);
      expect(transfered).toBe('Invalid issuer name');
      done();
    });

    it('should return No issuer description was provided', async done => {
      name = 'xpgeng';
      desc = null;

      const transfered = await uia.registerIssuer(name, desc);
      expect(transfered).toBe('No issuer description was provided');
      done();
    });

    it('should return Issuer name already exists', async done => {
      name = 'xpgeng';
      desc = { name: 'xpgeng' };
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.exists.mockReturnValue(true);

      const transfered = await uia.registerIssuer(name, desc);
      expect(transfered).toBe('Issuer name already exists');
      done();
    });

    it('should return Account is already an issuer', async done => {
      name = 'xpgeng';
      desc = { name: 'xpgeng' };
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: new BigNumber(100000000),
      } as IAccount;

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.exists.mockReturnValueOnce(null).mockReturnValueOnce(true);

      const transfered = await uia.registerIssuer(name, desc);
      expect(transfered).toBe('Account is already an issuer');
      done();
    });
  });

  describe('registerAsset', () => {
    let symbol: string;
    let desc;
    let maximum: number;
    let precision: number;

    afterEach(done => {
      delete (uia as any).sender;
      delete (uia as any).block;
      delete (uia as any).trs;

      symbol = undefined;
      desc = undefined;
      maximum = undefined;
      precision = undefined;

      done();
    });

    it('should register the asset', async done => {
      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 8;
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: new BigNumber(100000000),
      } as IAccount;
      (uia as any).trs = {
        id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
        timestamp: 12165155,
      } as Transaction;

      global.app.sdb.findOne.mockReturnValue(true);
      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.exists.mockReturnValue(null);
      global.app.sdb.create.mockReturnValue(null);

      const transfered = await uia.registerAsset(
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBeNull();
      done();
    });

    it('should return Invalid symbol', async done => {
      symbol = '!@#xpgeng';

      const transfered = await uia.registerAsset(
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Invalid symbol');
      done();
    });

    it('should return Precision should be positive integer', async done => {
      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 0.8;

      const transfered = await uia.registerAsset(
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Precision should be positive integer');
      done();
    });

    it('should return Invalid asset precision', async done => {
      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 17;

      const transfered = await uia.registerAsset(
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Invalid asset precision');
      done();
    });

    it('should return Account is not an issuer', async done => {
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: new BigNumber(200 * 1e8),
      } as IAccount;
      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 15;

      global.app.sdb.findOne.mockReturnValue(null);

      const transfered = await uia.registerAsset(
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Account is not an issuer');
      done();
    });

    it('should return Asset already exists', async done => {
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: new BigNumber(200 * 1e8),
      } as IAccount;
      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 15;

      global.app.sdb.findOne.mockReturnValue(true);
      global.app.sdb.exists.mockReturnValue(true);

      const transfered = await uia.registerAsset(
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Asset already exists');
      done();
    });
  });

  describe('issue', () => {
    let name;
    let amount;

    afterEach(done => {
      delete (uia as any).sender;
      delete (uia as any).block;
      delete (uia as any).trs;

      name = undefined;
      amount = undefined;
      done();
    });

    it('should update asset and balances by name and amount', async done => {
      name = 'xpgeng.GNY';
      amount = 10000;
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: new BigNumber(100000000),
      } as IAccount;

      const asset = {
        issuerId: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        quantity: 10000,
        maximum: 1000000000,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findOne.mockReturnValue(asset);
      global.app.sdb.update.mockReturnValue(null);
      global.app.balances.increase.mockReturnValue(null);

      const updated = await uia.issue(name, amount);
      expect(updated).toBeNull();
      done();
    });

    it('should return Asset not exists', async done => {
      name = 'xpgeng.GNY';
      amount = 10000;

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findOne.mockReturnValue(null);

      const updated = await uia.issue(name, amount);
      expect(updated).toBe('Asset not exists');
      done();
    });

    it('should return Permission denied', async done => {
      name = 'xpgeng.GNY';
      amount = 10000;
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: new BigNumber(100000000),
      } as IAccount;

      const asset = {
        issuerId: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        quantity: 10000,
        maximum: 1000000000,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findOne.mockReturnValue(asset);

      const updated = await uia.issue(name, amount);
      expect(updated).toBe('Permission denied');
      done();
    });

    it('should return Exceed issue limit', async done => {
      name = 'xpgeng.GNY';
      amount = 1000000000;
      (uia as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: new BigNumber(100000000),
      } as IAccount;

      const asset = {
        issuerId: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        quantity: 10000,
        maximum: 1000000000,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findOne.mockReturnValue(asset);

      const updated = await uia.issue(name, amount);
      expect(updated).toBe('Exceed issue limit');
      done();
    });
  });

  describe('transfer', () => {
    let currency: string;
    let amount: number;
    let recipient: string;

    beforeEach(done => {
      currency = 'gny';
      amount = 100000;
      recipient = 'GBR31pwhxvsgtrQDfzRxjfoPB62r';
      done();
    });

    afterEach(done => {
      delete (uia as any).sender;
      delete (uia as any).block;
      delete (uia as any).trs;

      currency = undefined;
      amount = undefined;
      recipient = undefined;
      done();
    });

    it('should transfer some amount of currency to a recipient', async done => {
      const balance = new global.app.util.bignumber(100000000);
      (uia as any).sender = {
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        gny: new BigNumber(100000000),
      } as IAccount;
      (uia as any).block = {
        height: 1,
      } as IBlock;
      (uia as any).trs = {
        id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
        timestamp: 12165155,
      } as Transaction;

      global.app.balances.get.mockReturnValue(balance);
      global.app.balances.transfer.mockReturnValue(null);
      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.create.mockReturnValue(null);

      const transfered = await uia.transfer(currency, amount, recipient);
      expect(transfered).toBeNull();
      done();
    });

    it('should return Invalid currency', async done => {
      currency = 'gnyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy';
      amount = 100000;

      const transfered = await uia.transfer(currency, amount, recipient);
      expect(transfered).toBe('Invalid currency');
      done();
    });

    it('should return Invalid recipient', async done => {
      currency = 'gny';
      amount = 100000;
      recipient =
        'Gsdsdsdfsdflklkjljlk123123kjkj238kj2k3jhkhei32hsjdflkjsldji12k3nkhefi2uh3knkenf';

      const transfered = await uia.transfer(currency, amount, recipient);
      expect(transfered).toBe('Invalid recipient');
      done();
    });

    it('should return Insufficient balance', async done => {
      (uia as any).sender = {
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        gny: new BigNumber(200),
      } as IAccount;
      const balance = new BigNumber(1000);

      global.app.balances.get.mockReturnValue(balance);
      const transfered = await uia.transfer(currency, amount, recipient);
      expect(transfered).toBe('Insufficient balance');
      done();
    });

    it('should return Recipient name not exist', async done => {
      (uia as any).sender = {
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        gny: new BigNumber(200),
      } as IAccount;
      recipient = 'xpgeng';
      const balance = new BigNumber(1000000000);

      global.app.balances.get.mockReturnValue(balance);
      global.app.sdb.findOne.mockReturnValue(null);

      const transfered = await uia.transfer(currency, amount, recipient);
      expect(transfered).toBe('Recipient name not exist');
      done();
    });
  });
});
