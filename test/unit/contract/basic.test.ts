import basic from '../../../src/contract/basic';
import BigNumber from 'bignumber.js';
import {
  ILogger,
  IAccount,
  IBlock,
  ITransaction,
} from '../../../packages/interfaces';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';

jest.mock('../../../packages/database-postgres/src/smartDB');

describe('basic', () => {
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
    delete (basic as any).sender;
    delete (basic as any).block;
    delete (basic as any).trs;

    done();
  });

  describe('transfer', () => {
    let amount: string;
    let recipient: string;
    beforeEach(done => {
      amount = String(100000);
      recipient = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
      done();
    });
    afterEach(done => {
      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

      amount = undefined;
      recipient = undefined;

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
        gny: String(100000000),
      } as IAccount;
      (basic as any).block = {
        height: String(1),
      } as IBlock;
      (basic as any).trs = {
        id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
        timestamp: 12165155,
      } as ITransaction;
      global.app.sdb.increase.mockReturnValue(recipientAccount);
      global.app.sdb.load.mockReturnValue(recipientAccount);

      const transfered = await basic.transfer(amount, recipient);
      expect(transfered).toBeNull();
      done();
    });
  });

  describe('setUserName', () => {
    let username: string;
    let account: IAccount;

    beforeEach(done => {
      username = 'xpgeng';
      account = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000000),
        username: username,
      } as IAccount;
      done();
    });
    afterEach(done => {
      username = undefined;
      account = undefined;

      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

      done();
    });

    it('should set the user name with returning null', async done => {
      // Assume the sender's usename is null
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000000),
        username: null,
      } as IAccount;

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
        gny: String(100000000),
        username: null,
      } as IAccount;

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
        gny: String(100000000),
        username: 'xpgeng',
      } as IAccount;

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);
      global.app.sdb.load.mockReturnValue(null);

      const set = await basic.setUserName(username);
      expect(set).toBe('Name already set');
      done();
    });
  });

  describe('setSecondPassphrase', () => {
    let publicKey: string;
    beforeEach(done => {
      publicKey =
        '2e65eb2d727adb6b39557c27093562aa93a9f8bad33a2d261acf4fce380c59b9';
      done();
    });
    afterEach(done => {
      publicKey = undefined;

      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

      done();
    });

    it('should set the second passphrase', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000000),
        secondPublicKey: null,
      } as IAccount;

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
        gny: String(100000000),
        secondPublicKey: null,
      } as IAccount;

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
        gny: String(100000000),
        secondPublicKey: publicKey,
      } as IAccount;

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);

      const set = await basic.setSecondPassphrase(publicKey);
      expect(set).toBe('Password already set');
      done();
    });
  });

  describe('lock', () => {
    let height: number;
    let amount: number;

    afterEach(done => {
      height = undefined;
      amount = undefined;

      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

      done();
    });

    it('should lock the account by height and amout', async done => {
      height = 5760 * 30 + 2;
      amount = 99;
      const vote = { delegate: 'liangpeili' };
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 0,
        lockHeight: String(0),
        lockAmount: String(0),
      } as IAccount;
      (basic as any).block = {
        height: String(1),
      } as IBlock;

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
        gny: String(100000100),
        isLocked: 0,
        lockHeight: String(0),
        lockAmount: String(0),
      } as IAccount;

      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Insufficient balance');
      done();
    });

    it('should return Invalid lock height if (sender.isLocked = 1)', async done => {
      height = 2;
      amount = 99;
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
        lockHeight: String(0),
        lockAmount: String(0),
      } as IAccount;
      (basic as any).block = {
        height: String(1),
      } as IBlock;

      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Invalid lock height');
      done();
    });

    it('should return Invalid height or amount if (sender.isLocked = 1)', async done => {
      height = 5760 * 30 + 2;
      amount = 0;
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
        lockHeight: String(0),
        lockAmount: String(0),
      } as IAccount;
      (basic as any).block = {
        height: String(1),
      } as IBlock;

      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Invalid amount');
      done();
    });

    it('should return Invalid lock height if (sender.isLocked = 0)', async done => {
      height = 2;
      amount = 0;
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 0,
        lockHeight: String(0),
        lockAmount: String(0),
      } as IAccount;
      (basic as any).block = {
        height: String(1),
      } as IBlock;

      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Invalid lock height');
      done();
    });

    it('should return Invalid height or amount if (sender.isLocked = 0)', async done => {
      height = 5760 * 30 + 2;
      amount = 0;
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 0,
        lockHeight: String(0),
        lockAmount: String(0),
      } as IAccount;
      (basic as any).block = {
        height: String(1),
      } as IBlock;

      const locked = await basic.lock(height, amount);
      expect(locked).toBe('Invalid amount');
      done();
    });
  });

  describe('unlock', () => {
    afterEach(done => {
      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

      done();
    });

    it('should unlock the account', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
        lockHeight: String(1),
        lockAmount: String(99),
        isDelegate: 0,
      } as IAccount;
      (basic as any).block = {
        height: String(2),
      } as IBlock;

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);

      const unlocked = await basic.unlock();
      expect(unlocked).toBeNull();
      done();
    });

    it('should return Account not found', async done => {
      (basic as any).sender = null;

      const unlocked = await basic.unlock();
      expect(unlocked).toBe('Account not found');
      done();
    });

    it('should return Account is not locked', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 0,
        lockHeight: String(0),
        lockAmount: String(0),
        isDelegate: 0,
      } as IAccount;

      global.app.sdb.lock.mockReturnValue(null);

      const unlocked = await basic.unlock();
      expect(unlocked).toBe('Account is not locked');
      done();
    });

    it('should return Account cannot unlock', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
        lockHeight: String(3),
        lockAmount: String(0),
        isDelegate: 0,
      } as IAccount;
      (basic as any).block = {
        height: String(2),
      } as IBlock;

      global.app.sdb.lock.mockReturnValue(null);

      const unlocked = await basic.unlock();
      expect(unlocked).toBe('Account cannot unlock');
      done();
    });
  });

  describe('registerDelegate', () => {
    afterEach(done => {
      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

      done();
    });

    it('should return null', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
        lockHeight: String(1),
        lockAmount: String(99),
        isDelegate: 0,
        username: 'xpgeng',
      } as IAccount;
      (basic as any).block = {
        height: String(2),
      } as IBlock;
      (basic as any).trs = {
        id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
        timestamp: 12165155,
      } as ITransaction;

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.create.mockReturnValue(null);
      global.app.sdb.update.mockReturnValue(null);

      const registered = await basic.registerDelegate();
      expect(registered).toBeNull();
      done();
    });

    it('should return Account not found', async done => {
      (basic as any).sender = null;

      global.app.sdb.lock.mockReturnValue(null);

      const registered = await basic.registerDelegate();
      expect(registered).toBe('Account not found');
      done();
    });

    it('should return Account not found', async done => {
      (basic as any).sender = null;

      global.app.sdb.lock.mockReturnValue(null);

      const registered = await basic.registerDelegate();
      expect(registered).toBe('Account not found');
      done();
    });

    it('should return Account has not a name', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
        lockHeight: String(3),
        lockAmount: String(0),
        isDelegate: 0,
        username: null,
      } as IAccount;
      (basic as any).block = {
        height: String(2),
      } as IBlock;

      global.app.sdb.lock.mockReturnValue(null);

      const registered = await basic.registerDelegate();
      expect(registered).toBe('Account has not a name');
      done();
    });

    it('should return Account is already Delegate', async done => {
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
        lockHeight: String(3),
        lockAmount: String(0),
        isDelegate: 1,
        username: 'xpgeng',
      } as IAccount;
      (basic as any).block = {
        height: String(2),
      } as IBlock;

      global.app.sdb.lock.mockReturnValue(null);

      const registered = await basic.registerDelegate();
      expect(registered).toBe('Account is already Delegate');
      done();
    });
  });

  describe('vote', () => {
    let delegates: string;
    let currentVotes;

    beforeEach(done => {
      delegates = 'xpgeng,liangpeili,a1300';
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
      } as IAccount;
      currentVotes = [
        {
          voterAddress: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          delegate: 'bob',
        },
        {
          voterAddress: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          delegate: 'alice',
        },
        {
          voterAddress: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          delegate: 'cookie',
        },
      ];
      done();
    });
    afterEach(done => {
      delegates = undefined;
      currentVotes = undefined;

      done();
    });

    it('should return null', async done => {
      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findAll.mockReturnValue(currentVotes);
      global.app.sdb.exists.mockReturnValue(true);
      global.app.sdb.increase.mockReturnValue(null);
      global.app.sdb.create.mockReturnValue(null);

      const voted = await basic.vote(delegates);
      expect(voted).toBeNull();
      done();
    });

    it('should return Account is not locked', async done => {
      (basic as any).sender.isLocked = 0;

      global.app.sdb.lock.mockReturnValue(null);

      const voted = await basic.vote(delegates);
      expect(voted).toBe('Account is not locked');
      done();
    });

    // it('should return Invalid delegates', async done => {
    //   delegates = ' ';
    //   global.app.sdb.lock.mockReturnValue(null);

    //   const voted = await basic.vote(delegates);
    //   expect(voted).toBe('Invalid delegates');
    //   done();
    // });

    it('should return Voting limit exceeded', async done => {
      delegates = '';
      for (let i = 0; i < 34; i++) {
        delegates += i + ',';
      }

      global.app.sdb.lock.mockReturnValue(null);

      const voted = await basic.vote(delegates);
      expect(voted).toBe('Voting limit exceeded');
      done();
    });

    it('should return Duplicated vote item', async done => {
      delegates = 'xpgeng,liangpeili,a1300,liangpeili';

      global.app.sdb.lock.mockReturnValue(null);

      const voted = await basic.vote(delegates);
      expect(voted).toBe('Duplicated vote item');
      done();
    });

    it('should return Maximum number of votes exceeded', async done => {
      delegates = '';
      for (let i = 0; i < 30; i++) {
        delegates += i + ',';
      }

      for (let i = 0; i < 70; i++) {
        currentVotes.push({ delegate: String(i) });
      }

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findAll.mockReturnValue(currentVotes);

      const voted = await basic.vote(delegates);
      expect(voted).toBe('Maximum number of votes exceeded');
      done();
    });

    it('should return Already voted for delegate: xpgeng', async done => {
      currentVotes.push({ delegate: 'xpgeng' });

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findAll.mockReturnValue(currentVotes);

      const voted = await basic.vote(delegates);
      expect(voted).toBe('Already voted for delegate: xpgeng');
      done();
    });

    it('should return Voted delegate not exists:: xpgeng', async done => {
      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findAll.mockReturnValue(currentVotes);
      global.app.sdb.exists.mockReturnValue(null);

      const voted = await basic.vote(delegates);
      expect(voted).toBe('Voted delegate not exists: xpgeng');
      done();
    });
  });

  describe('unvote', () => {
    let delegates: string;
    let currentVotes;

    beforeEach(done => {
      delegates = 'xpgeng,liangpeili,a1300';
      (basic as any).sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000100),
        isLocked: 1,
      } as IAccount;

      currentVotes = [
        {
          voterAddress: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          delegate: 'xpgeng',
        },
        {
          voterAddress: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          delegate: 'liangpeili',
        },
        {
          voterAddress: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          delegate: 'a1300',
        },
      ];
      done();
    });
    afterEach(done => {
      delegates = undefined;
      currentVotes = undefined;

      done();
    });

    it('should return null', async done => {
      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findAll.mockReturnValue(currentVotes);
      global.app.sdb.exists.mockReturnValue(true);
      global.app.sdb.increase.mockReturnValue(null);
      global.app.sdb.del.mockReturnValue(null);

      const unvoted = await basic.unvote(delegates);
      expect(unvoted).toBeNull();
      done();
    });

    it('should return Account is not locked', async done => {
      (basic as any).sender.isLocked = 0;

      global.app.sdb.lock.mockReturnValue(null);

      const unvoted = await basic.unvote(delegates);
      expect(unvoted).toBe('Account is not locked');
      done();
    });

    // it('should return Invalid delegates', async done => {
    //   delegates = ' ';
    //   global.app.sdb.lock.mockReturnValue(null);

    //   const voted = await basic.unvote(delegates);
    //   expect(voted).toBe('Invalid delegates');
    //   done();
    // });

    it('should return Voting limit exceeded', async done => {
      delegates = '';
      for (let i = 0; i < 34; i++) {
        delegates += i + ',';
      }

      global.app.sdb.lock.mockReturnValue(null);

      const unvoted = await basic.unvote(delegates);
      expect(unvoted).toBe('Voting limit exceeded');
      done();
    });

    it('should return Duplicated vote item', async done => {
      delegates = 'xpgeng,liangpeili,a1300,liangpeili';

      global.app.sdb.lock.mockReturnValue(null);

      const unvoted = await basic.unvote(delegates);
      expect(unvoted).toBe('Duplicated vote item');
      done();
    });

    it('should return Delegate not voted yet: a1300', async done => {
      currentVotes.pop(2);

      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findAll.mockReturnValue(currentVotes);

      const unvoted = await basic.unvote(delegates);
      expect(unvoted).toBe('Delegate not voted yet: a1300');
      done();
    });

    it('should return Voted delegate not exists: xpgeng', async done => {
      global.app.sdb.lock.mockReturnValue(null);
      global.app.sdb.findAll.mockReturnValue(currentVotes);
      global.app.sdb.exists.mockReturnValue(null);

      const unvoted = await basic.unvote(delegates);
      expect(unvoted).toBe('Voted delegate not exists: xpgeng');
      done();
    });
  });
});
