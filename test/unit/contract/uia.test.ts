import { jest } from '@jest/globals';
import uia from '@gny/main/uia';
import { BigNumber } from 'bignumber.js';
import { ILogger, IAccount, IBlock, ITransaction } from '@gny/interfaces';
// import BalanceManager from '@gny/main/balance-manager';
import { IApp } from '@gny/main/globalInterfaces';
import { IConfig } from '@gny/interfaces';

// mocking of ES modules currently not supported in jest
// https://github.com/facebook/jest/issues/9430
// therefore we need to manually mock every function

declare global {
  namespace NodeJS {
    interface Global {
      app: Partial<IApp>;
      Config: Partial<IConfig>;
    }
  }
}

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

    global.app = {
      validate: jest.fn((type, value) => null),
    };

    done();
  });

  afterEach(done => {
    delete (uia as any).sender;
    delete (uia as any).block;
    delete (uia as any).trs;

    jest.resetAllMocks();
    delete (uia as any).sdb;
    delete global.app;

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

    it('should register the issuer', async () => {
      name = 'xpgeng';
      desc = { name: 'xpgeng' };

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
        } as IAccount,
        trs: {
          id:
            '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
          timestamp: 12165155,
        } as ITransaction,
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        exists: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue(null),
      } as any;

      const transfered = await uia.registerIssuer.call(context, name, desc);
      expect(transfered).toBeNull();
    });

    it('should return Invalid issuer name', async () => {
      name = '!@#xpgeng';

      const context = {};

      const transfered = await uia.registerIssuer.call(context, name, desc);
      expect(transfered).toBe('Invalid issuer name');
    });

    it('should return No issuer description was provided', async () => {
      name = 'xpgeng';
      desc = null;
      const context = {};

      global.app = {
        validate: jest.fn().mockImplementation(() => {
          throw new Error('Invalid description');
        }),
      };

      const promise = uia.registerIssuer.call(context, name, desc);
      return expect(promise).rejects.toThrowError('Invalid description');
    });

    it('should return Issuer name already exists', async () => {
      name = 'xpgeng';
      desc = { name: 'xpgeng' };

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: 100000000,
        },
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        exists: jest.fn().mockReturnValue(true),
      } as any;

      // global.app.sdb.lock.mockReturnValue(null);
      // global.app.sdb.exists.mockReturnValue(true);

      const transfered = await uia.registerIssuer.call(context, name, desc);
      expect(transfered).toBe('Issuer name already exists');
    });

    it('should return Account is already an issuer', async () => {
      name = 'xpgeng';
      desc = { name: 'xpgeng' };
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
        } as IAccount,
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        exists: jest
          .fn()
          .mockReturnValueOnce(null)
          .mockReturnValueOnce(true),
      } as any;

      const transfered = await uia.registerIssuer.call(context, name, desc);
      expect(transfered).toBe('Account is already an issuer');
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

      delete global.app.sdb;

      symbol = undefined;
      desc = undefined;
      maximum = undefined;
      precision = undefined;

      done();
    });

    it('should register the asset', async () => {
      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 8;

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
        } as IAccount,
        trs: {
          id:
            '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
          timestamp: 12165155,
        } as ITransaction,
      };

      global.app.sdb = {
        findOne: jest.fn().mockReturnValue(true),
        lock: jest.fn().mockReturnValue(null),
        exists: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue(null),
      } as any;

      const transfered = await uia.registerAsset.call(
        context,
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBeNull();
    });

    it('should return Invalid symbol', async () => {
      symbol = '!@#xpgeng';
      const context = {};

      const transfered = await uia.registerAsset.call(
        context,
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Invalid symbol');
    });

    it('should return Precision should be positive integer', async () => {
      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 0.8;
      const context = {};

      const transfered = await uia.registerAsset.call(
        context,
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Precision should be positive integer');
    });

    it('should return Invalid asset precision', async () => {
      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 17;
      const context = {};

      const transfered = await uia.registerAsset.call(
        context,
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Invalid asset precision');
    });

    it('should return Account is not an issuer', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(200 * 1e8),
        } as IAccount,
      };

      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 15;

      global.app.sdb = {
        findOne: jest.fn().mockReturnValue(null),
      } as any;

      const transfered = await uia.registerAsset.call(
        context,
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Account is not an issuer');
    });

    it('should return Asset already exists', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(200 * 1e8),
        } as IAccount,
      };

      symbol = 'GNY';
      desc = { symbol: 'GNY' };
      maximum = 1000000;
      precision = 15;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(true),
        exists: jest.fn().mockReturnValue(true),
      } as any;

      const transfered = await uia.registerAsset.call(
        context,
        symbol,
        desc,
        maximum,
        precision
      );
      expect(transfered).toBe('Asset already exists');
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

    it('should update asset and balances by name and amount', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
        } as IAccount,
      };

      name = 'xpgeng.GNY';
      amount = 10000;

      const asset = {
        issuerId: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        quantity: 10000,
        maximum: 1000000000,
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(asset),
        update: jest.fn().mockReturnValue(null),
      } as any;

      // balance-manager
      global.app.balances = {
        increase: jest.fn().mockReturnValue(null),
      } as any;

      const updated = await uia.issue.call(context, name, amount);
      expect(updated).toBeNull();
    });

    it('should return Asset not exists', async () => {
      name = 'xpgeng.GNY';
      amount = 10000;
      const context = {};

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(null),
      } as any;

      const updated = await uia.issue.call(context, name, amount);
      expect(updated).toBe('Asset not exists');
    });

    it('should return Permission denied', async () => {
      name = 'xpgeng.GNY';
      amount = 10000;

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
        } as IAccount,
      };

      const asset = {
        issuerId: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        quantity: 10000,
        maximum: 1000000000,
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(asset),
      } as any;

      const updated = await uia.issue.call(context, name, amount);
      expect(updated).toBe('Permission denied');
    });

    it('should return Exceed issue limit', async () => {
      name = 'xpgeng.GNY';
      amount = 1000000000;
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
        } as IAccount,
      };

      const asset = {
        issuerId: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        quantity: 10000,
        maximum: 1000000000,
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(asset),
      } as any;

      const updated = await uia.issue.call(context, name, amount);
      expect(updated).toBe('Exceed issue limit');
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

      delete global.app.sdb;
      done();
    });

    it('should transfer some amount of currency to a recipient', async () => {
      const balance = new BigNumber(100000000);

      const context = {
        sender: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          gny: String(100000000),
        } as IAccount,
        block: {
          height: String(1),
        } as IBlock,
        trs: {
          id:
            '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
          timestamp: 12165155,
        } as ITransaction,
      };

      // balance-manager
      global.app.balances = {
        get: jest.fn().mockReturnValue(balance),
        transfer: jest.fn().mockReturnValue(null),
      } as any;
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue(null),
      } as any;

      const transfered = await uia.transfer.call(
        context,
        currency,
        amount,
        recipient
      );
      expect(transfered).toBeNull();
    });

    it('should return Invalid currency', async () => {
      currency = 'gnyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy';
      amount = 100000;
      const context = {};

      const transfered = await uia.transfer.call(
        context,
        currency,
        amount,
        recipient
      );
      expect(transfered).toBe('Invalid currency');
    });

    it('should return Invalid recipient', async () => {
      currency = 'gny';
      amount = 100000;
      recipient =
        'Gsdsdsdfsdflklkjljlk123123kjkj238kj2k3jhkhei32hsjdflkjsldji12k3nkhefi2uh3knkenf';
      const context = {};

      const transfered = await uia.transfer.call(
        context,
        currency,
        amount,
        recipient
      );
      expect(transfered).toBe('Invalid recipient');
    });

    it('should return Insufficient balance', async () => {
      const context = {
        sender: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          gny: String(200),
        } as IAccount,
      };

      const balance = new BigNumber(1000);

      // balance-manager
      global.app.balances = {
        get: jest.fn().mockReturnValue(balance),
      } as any;

      const transfered = await uia.transfer.call(
        context,
        currency,
        amount,
        recipient
      );
      expect(transfered).toBe('Insufficient balance');
    });

    it('should return Recipient name not exist', async () => {
      const context = {
        sender: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          gny: String(200),
        } as IAccount,
      };

      recipient = 'xpgeng';
      const balance = new BigNumber(1000000000);

      // balance manager
      global.app.balances = {
        get: jest.fn().mockReturnValue(balance),
      } as any;

      global.app.sdb = {
        findOne: jest.fn().mockReturnValue(null),
      } as any;

      const transfered = await uia.transfer.call(
        context,
        currency,
        amount,
        recipient
      );
      expect(transfered).toBe('Recipient name not exist');
    });
  });
});
