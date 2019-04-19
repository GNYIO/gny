import basic from '../../../src/contract/basic';
import BigNumber from 'bignumber.js';
import { ILogger } from '../../../src/interfaces';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';

jest.mock('../../../packages/database-postgres/src/smartDB');

describe('Consensus', () => {
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
      util: {
        address: {
          isAddress: jest.fn(addr => true),
          generateAddress: jest.fn(),
        },
        bignumber: BigNumber,
      },
      sdb: new SmartDB(logger),
    };
    done();
  });

  afterEach(done => {
    done();
  });

  describe('transfer', () => {
    let amount;
    let recipient;
    beforeEach(done => {
      amount = 100000;
      recipient = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
      done();
    });

    it('should transfer to a recipient account', async done => {
      const recipientAccount = {
        address: recipient,
        gny: amount,
        username: null,
      };
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
      };
      (basic as any).block = {
        height: 1,
      };
      (basic as any).trs = {
        id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
        timestamp: 12165155,
      };
      global.app.sdb.increase.mockReturnValue(recipientAccount);
      global.app.sdb.load.mockReturnValue(recipientAccount);
      const transfered = await basic.transfer(amount, recipient);
      expect(transfered).toBeNull();
      done();
    });
  });

  describe('setUserName', () => {
    let username;
    let account;

    beforeEach(done => {
      username = 'xpgeng';
      account = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
        username: username,
      };

      done();
    });

    it('should set the user name with returning null', async done => {
      // Assume the sender's usename is null
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
        username: null,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);
      global.app.sdb.load.mockReturnValue(null);

      const set = await basic.setUserName(username);
      expect((basic as any).sender.username).toBe(username);
      expect(set).toBeNull();
      done();
    });

    it('should return Name already registered', async done => {
      // Assume the sender's usename is null
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
        username: null,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);
      global.app.sdb.load.mockReturnValue(account);

      const set = await basic.setUserName(username);
      expect(set).toBe('Name already registered');
      done();
    });

    it('should return Name already set', async done => {
      // Assume the sender's usename is null
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
        username: 'xpgeng',
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);
      global.app.sdb.load.mockReturnValue(null);

      const set = await basic.setUserName(username);
      expect(set).toBe('Name already set');
      done();
    });
  });

  describe('setSecondPassphrase', () => {
    let publicKey;
    beforeEach(done => {
      publicKey =
        '2e65eb2d727adb6b39557c27093562aa93a9f8bad33a2d261acf4fce380c59b9';
      done();
    });

    it('should set the second passphrase', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
        secondPublicKey: null,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);
      const set = await basic.setSecondPassphrase(publicKey);
      expect((basic as any).sender.secondPublicKey).toBe(publicKey);
      expect(set).toBeNull();
      done();
    });

    it('should return Invalid account type', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
        secondPublicKey: null,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);
      global.app.util.address.isAddress.mockReturnValue(false);

      const set = await basic.setSecondPassphrase(publicKey);
      expect(set).toBe('Invalid account type');
      done();
    });

    it('should return Password already set', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000000,
        secondPublicKey: publicKey,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);

      const set = await basic.setSecondPassphrase(publicKey);
      expect(set).toBe('Password already set');
      done();
    });
  });

  describe('lock', () => {
    let height;
    let amount;

    beforeEach(done => {
      done();
    });

    it('should lock the account by height and amout', async done => {
      height = 5760 * 30 + 2;
      amount = 99;
      const vote = { delegate: 'liangpeili' };
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000100,
        isLocked: 0,
        lockHeight: 0,
        lockAmount: 0,
      };
      (basic as any).block = {
        height: 1,
      };

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);
      global.app.sdb.findAll.mockReturnValue([vote]);
      global.app.sdb.increase.mockReturnValue(null);

      const locked = await basic.lock(height, amount);
      expect(locked).toBeNull();
      done();
    });

    it('should return Height should be positive integer', async done => {
      height = 1.2;
      amount = 99;
      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Height should be positive integer');
      done();
    });

    it('should return Insufficient balance', async done => {
      height = 5760 * 30 + 2;
      amount = 101;
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000100,
        isLocked: 0,
        lockHeight: 0,
        lockAmount: 0,
      };

      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Insufficient balance');
      done();
    });

    it('should return Invalid lock height', async done => {
      height = 2;
      amount = 99;
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000100,
        isLocked: 1,
        lockHeight: 0,
        lockAmount: 0,
      };
      (basic as any).block = {
        height: 1,
      };

      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Invalid lock height');
      done();
    });

    it('should return Invalid height or amount', async done => {
      height = 5760 * 30 + 2;
      amount = 0;
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 100000100,
        isLocked: 1,
        lockHeight: 0,
        lockAmount: 0,
      };
      (basic as any).block = {
        height: 1,
      };

      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Invalid amount');
      done();
    });
  });
});
