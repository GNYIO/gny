import { jest } from '@jest/globals';
import uia from '@gnyio/main/uia';
import { BigNumber } from 'bignumber.js';
import { ILogger, IAccount, IBlock, ITransaction } from '@gnyio/interfaces';
// import BalanceManager from '@gnyio/main/balance-manager';
import { IApp } from '@gnyio/main/globalInterfaces';
import { IConfig } from '@gnyio/interfaces';

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
    it('registerIssuer() - throws if wrong publicKey is set (collision attack attempt)', async () => {
      const name = 'xpgeng';
      const desc = 'description';

      const context = {
        sender: {
          publicKey: 'one',
        },
        trs: {
          senderPublicKey: 'two',
        },
      };

      const result = await uia.registerIssuer.call(context, name, desc);
      expect(result).toEqual('collission attack attempt');
    });

    it('should register the issuer', async () => {
      const name = 'xpgeng';
      const desc = { name: 'xpgeng' };

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
      const name = '!@#xpgeng';
      const desc = undefined;

      const context = {
        sender: {},
      };

      const transfered = await uia.registerIssuer.call(context, name, desc);
      expect(transfered).toBe('Invalid issuer name');
    });

    it('should return No issuer description was provided', async () => {
      const name = 'xpgeng';
      const desc = null;
      const context = {
        sender: {},
      };

      global.app = {
        validate: jest.fn().mockImplementation(() => {
          throw new Error('Invalid description');
        }),
      };

      const promise = uia.registerIssuer.call(context, name, desc);
      return expect(promise).rejects.toThrowError('Invalid description');
    });

    it('should return Issuer name already exists', async () => {
      const name = 'xpgeng';
      const desc = { name: 'xpgeng' };

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
      const name = 'xpgeng';
      const desc = { name: 'xpgeng' };
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
    afterEach(done => {
      delete (uia as any).sender;
      delete (uia as any).block;
      delete (uia as any).trs;

      delete global.app.sdb;

      done();
    });

    it('should register the asset', async () => {
      const symbol = 'GNY';
      const desc = { symbol: 'GNY' };
      const maximum = 1000000;
      const precision = 8;

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
      const symbol = '!@#xpgeng';
      const desc = undefined;
      const maximum = undefined;
      const precision = undefined;

      const context = {
        sender: {},
      };

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
      const symbol = 'GNY';
      const desc = { symbol: 'GNY' };
      const maximum = 1000000;
      const precision = 0.8;
      const context = {
        sender: {},
      };

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
      const symbol = 'GNY';
      const desc = { symbol: 'GNY' };
      const maximum = 1000000;
      const precision = 17;
      const context = {
        sender: {},
      };

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

      const symbol = 'GNY';
      const desc = { symbol: 'GNY' };
      const maximum = 1000000;
      const precision = 15;

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

      const symbol = 'GNY';
      const desc = { symbol: 'GNY' };
      const maximum = 1000000;
      const precision = 15;

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
    it('issue() - throws if wrong publicKey is set (collision attack attempt)', async () => {
      const name = 'xpgeng.GNY';
      const amount = 10000;

      const context = {
        sender: {
          publicKey: 'one',
        },
        trs: {
          senderPublicKey: 'two',
        },
      };

      const result = await uia.issue.call(context, name, amount);
      expect(result).toEqual('collission attack attempt');
    });

    it('should update asset and balances by name and amount', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
        } as IAccount,
      };

      const name = 'xpgeng.GNY';
      const amount = 10000;

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
      const name = 'xpgeng.GNY';
      const amount = 10000;
      const context = {
        sender: {},
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(null),
      } as any;

      const updated = await uia.issue.call(context, name, amount);
      expect(updated).toBe('Asset not exists');
    });

    it('should return Permission denied', async () => {
      const name = 'xpgeng.GNY';
      const amount = 10000;

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
      const name = 'xpgeng.GNY';
      const amount = 1000000000;
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
    it('transfer() - throws if wrong publicKey is set (collision attack attempt)', async () => {
      const currency = 'gny';
      const amount = 100000;
      const recipient = 'GBR31pwhxvsgtrQDfzRxjfoPB62r';

      const context = {
        sender: {
          publicKey: 'one',
        },
        trs: {
          senderPublicKey: 'two',
        },
      };

      const result = await uia.transfer.call(
        context,
        currency,
        amount,
        recipient
      );
      expect(result).toEqual('collission attack attempt');
    });

    it('should transfer some amount of currency to a recipient', async () => {
      const currency = 'gny';
      const amount = 100000;
      const recipient = 'GBR31pwhxvsgtrQDfzRxjfoPB62r';

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
      const currency = 'gnyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy';
      const amount = 100000;
      const recipient = 'GBR31pwhxvsgtrQDfzRxjfoPB62r';

      const context = {
        sender: {},
      };

      const transfered = await uia.transfer.call(
        context,
        currency,
        amount,
        recipient
      );
      expect(transfered).toBe('Invalid currency');
    });

    it('should return Invalid recipient', async () => {
      const currency = 'gny';
      const amount = 100000;
      const recipient =
        'Gsdsdsdfsdflklkjljlk123123kjkj238kj2k3jhkhei32hsjdflkjsldji12k3nkhefi2uh3knkenf';
      const context = {
        sender: {},
      };

      const transfered = await uia.transfer.call(
        context,
        currency,
        amount,
        recipient
      );
      expect(transfered).toBe('Invalid recipient');
    });

    it('should return Insufficient balance', async () => {
      const currency = 'gny';
      const amount = 100000;
      const recipient = 'GBR31pwhxvsgtrQDfzRxjfoPB62r';

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
      const currency = 'gny';
      const amount = 100000;
      const recipient = 'xpgeng';

      const context = {
        sender: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          gny: String(200),
        } as IAccount,
      };

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
