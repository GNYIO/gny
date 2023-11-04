import { jest } from '@jest/globals';

import basic from '@gny/main/basic';
import { IApp } from '@gny/main/globalInterfaces';
import {
  ILogger,
  IAccount,
  IBlock,
  ITransaction,
  Context,
  IVote,
} from '@gny/interfaces';
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
    };
    global.Config = {
      netVersion: 'localnet',
    };
    done();
  });

  afterEach(done => {
    delete (basic as any).sender;
    delete (basic as any).block;
    delete (basic as any).trs;

    // new
    jest.clearAllMocks();
    delete (basic as any).sdb;

    done();
  });

  describe('transfer', () => {
    // let amount: string;
    // let recipient: string;
    // beforeEach(done => {
    //   amount = String(100000);
    //   recipient = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
    //   done();
    // });
    // afterEach(done => {
    //   delete (basic as any).sender;
    //   delete (basic as any).block;
    //   delete (basic as any).trs;

    //   amount = undefined;
    //   recipient = undefined;

    //   done();
    // });

    it('should transfer to a recipient account', async () => {
      const amount = String(100000);
      const recipient = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

      const recipientAccount = {
        address: recipient,
        gny: amount,
        username: null as unknown,
      } as IAccount;

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
        } as IAccount,
        block: {
          height: String(1),
        },
        trs: {
          id:
            '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
          timestamp: 12165155,
        } as ITransaction,
      } as Context;

      global.app.sdb = {
        increase: jest.fn().mockReturnValue(recipientAccount),
        load: jest.fn().mockReturnValue(recipientAccount),
        create: jest.fn(),
      } as any;

      const transfered = await basic.transfer.call(context, amount, recipient);
      expect(transfered).toBeNull();
    });
  });

  describe('setUserName', () => {
    it('should set the user name with returning null', async () => {
      // Assume the sender's username is null
      const username = 'xpgeng';
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
          username: null as unknown,
        } as IAccount,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
        load: jest.fn().mockReturnValue(null),
      } as any;

      const set = await basic.setUserName.call(context, username);

      expect(context.sender.username).toBe(username);
      expect(set).toBeNull();
    });

    it('should return Name already registered', async () => {
      // Assume the sender's username is null
      const username = 'xpgeng';
      const account = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: String(100000000),
        username: username,
      } as IAccount;
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
          username: null as unknown,
        } as IAccount,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
        load: jest.fn().mockReturnValue(account),
      } as any;

      const set = await basic.setUserName.call(context, username);
      expect(set).toBe('Name already registered');
    });

    it('should return Name already set', async () => {
      // Assume the sender's username is null
      const username = 'xpgeng';
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
          username: 'xpgeng',
        } as IAccount,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
        load: jest.fn().mockReturnValue(null),
      } as any;

      const set = await basic.setUserName.call(context, username);
      expect(set).toBe('Name already set');
    });
  });

  describe('setSecondPassphrase', () => {
    const publicKey: string =
      '2e65eb2d727adb6b39557c27093562aa93a9f8bad33a2d261acf4fce380c59b9';

    it('should set the second passphrase', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
          secondPublicKey: null as unknown,
        } as IAccount,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
      } as any;

      const result = await basic.setSecondPassphrase.call(context, publicKey);
      expect(context.sender.secondPublicKey).toBe(publicKey);
      expect(result).toBeNull();
    });

    it('should return Invalid account type', async () => {
      const context = {
        sender: {
          address: 'SOME-WRONG-ADDRESS',
          gny: String(100000000),
          secondPublicKey: null as unknown,
        } as IAccount,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
      } as any;

      const set = await basic.setSecondPassphrase.call(context, publicKey);
      expect(set).toBe('Invalid account type');
    });

    it('should return Password already set', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000000),
          secondPublicKey: publicKey,
        } as IAccount,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
      } as any;

      const set = await basic.setSecondPassphrase.call(context, publicKey);
      expect(set).toBe('Password already set');
    });
  });

  describe('lock', () => {
    it('should lock the account by height and amout', async () => {
      const height = 5760 * 30 + 2;
      const amount = 99;

      const vote = { delegate: 'liangpeili' };
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 0,
          lockHeight: String(0),
          lockAmount: String(0),
        } as IAccount,
        block: {
          height: String(1),
        },
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
        findAll: jest.fn().mockReturnValue([vote]),
        increase: jest.fn().mockReturnValue(null),
      } as any;

      const locked = await basic.lock.call(context, height, amount);
      expect(locked).toBeNull();
    });

    it('should return Insufficient balance', async () => {
      const height = 5760 * 30 + 2;
      const amount = 101;

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 0,
          lockHeight: String(0),
          lockAmount: String(0),
        } as IAccount,
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const locked = await basic.lock.call(context, height, amount);
      expect(locked).toBe('Insufficient balance');
    });

    it('should return Invalid lock height if (sender.isLocked = 1)', async () => {
      const height = 2;
      const amount = 99;

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
          lockHeight: String(0),
          lockAmount: String(0),
        } as IAccount,
        block: {
          height: String(1),
        },
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const locked = await basic.lock.call(context, height, amount);
      expect(locked).toBe('Invalid lock height');
    });

    it('should return Invalid height or amount if (sender.isLocked = 1)', async () => {
      const height = 5760 * 30 + 2;
      const amount = 0;

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
          lockHeight: String(0),
          lockAmount: String(0),
        } as IAccount,
        block: {
          height: String(1),
        },
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const locked = await basic.lock.call(context, height, amount);
      expect(locked).toBe('Invalid amount');
    });

    it('should return Invalid lock height if (sender.isLocked = 0)', async () => {
      const height = 2;
      const amount = 0;

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 0,
          lockHeight: String(0),
          lockAmount: String(0),
        } as IAccount,
        block: {
          height: String(1),
        },
      };

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const locked = await basic.lock.call(context, height, amount);
      expect(locked).toBe('Invalid lock height');
    });

    it('should return Invalid height or amount if (sender.isLocked = 0)', async () => {
      const height = 5760 * 30 + 2;
      const amount = 0;

      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 0,
          lockHeight: String(0),
          lockAmount: String(0),
        } as IAccount,
        block: {
          height: String(1),
        },
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const locked = await basic.lock.call(context, height, amount);
      expect(locked).toBe('Invalid amount');
    });
  });

  describe('unlock', () => {
    afterEach(done => {
      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

      jest.restoreAllMocks();

      done();
    });

    it('should unlock the account', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
          lockHeight: String(1),
          lockAmount: String(99),
          isDelegate: 0,
        } as IAccount,
        block: {
          height: String(2),
        },
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
      } as any;

      const unlocked = await basic.unlock.call(context);
      expect(unlocked).toBeNull();
    });

    it('should return Account not found', async () => {
      const context = {
        sender: null as unknown,
      } as Context;

      const unlocked = await basic.unlock.call(context);
      expect(unlocked).toBe('Account not found');
    });

    it('should return Account is not locked', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 0,
          lockHeight: String(0),
          lockAmount: String(0),
          isDelegate: 0,
        } as IAccount,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const unlocked = await basic.unlock.call(context);
      expect(unlocked).toBe('Account is not locked');
    });

    it('should return Account cannot unlock', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
          lockHeight: String(3),
          lockAmount: String(0),
          isDelegate: 0,
        } as IAccount,
        block: {
          height: String(2),
        },
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const unlocked = await basic.unlock.call(context);
      expect(unlocked).toBe('Account cannot unlock');
    });
  });

  describe('registerDelegate', () => {
    afterEach(done => {
      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

      jest.restoreAllMocks();

      done();
    });

    it('should return null', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
          lockHeight: String(1),
          lockAmount: String(99),
          isDelegate: 0,
          username: 'xpgeng',
        } as IAccount,
        block: {
          height: String(2),
        } as IBlock,
        trs: {
          id:
            '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
          timestamp: 12165155,
        } as ITransaction,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue(null),
        update: jest.fn().mockReturnValue(null),
      } as any;

      const registered = await basic.registerDelegate.call(context);
      expect(registered).toBeNull();
    });

    it('should return Account not found', async () => {
      const context = {
        sender: undefined as unknown,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const registered = await basic.registerDelegate.call(context);
      expect(registered).toBe('Account not found');
    });

    it('should return Account not found', async () => {
      const context = {
        sender: undefined as unknown,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const registered = await basic.registerDelegate.call(context);
      expect(registered).toBe('Account not found');
    });

    it('should return Account has not a name', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
          lockHeight: String(3),
          lockAmount: String(0),
          isDelegate: 0,
          username: (null as unknown) as string,
        } as IAccount,
        block: {
          height: String(2),
        },
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const registered = await basic.registerDelegate.call(context);
      expect(registered).toBe('Account has not a name');
    });

    it('should return Account is already Delegate', async () => {
      const context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
          lockHeight: String(3),
          lockAmount: String(0),
          isDelegate: 1,
          username: 'xpgeng',
        } as IAccount,
        block: {
          height: String(2),
        },
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const registered = await basic.registerDelegate.call(context);
      expect(registered).toBe('Account is already Delegate');
    });
  });

  describe('vote', () => {
    let delegates: string;
    let context: Context;
    let currentVotes;
    let oneAccount;

    beforeEach(done => {
      delegates = 'xpgeng,liangpeili,a1300';

      context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
        } as IAccount,
        block: {
          height: String(10),
        } as Pick<IBlock, 'height'>,
      } as Context;

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
      oneAccount = {
        lockAmount: String(200000 * 1e8),
      } as IAccount;
      done();
    });

    afterEach(done => {
      delegates = '';
      currentVotes = undefined;
      oneAccount = undefined;

      jest.restoreAllMocks();

      done();
    });

    it('should return null', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findAll: jest.fn().mockReturnValue(currentVotes),
        exists: jest.fn().mockReturnValue(true),
        increase: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(oneAccount),
      } as any;

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBeNull();
    });

    it('should fail if passed 0 argument', async () => {
      global.app.sdb = {} as any;

      const voted = await basic.vote.call(context);
      expect(voted).toEqual('Invalid arguments length');
    });

    it('should fail if passed 2 arguments', async () => {
      global.app.sdb = {} as any;

      const voted = await basic.vote.call(context, 'one', 'two');
      expect(voted).toEqual('Invalid arguments length');
    });

    it('should fail if passed 3 arguments', async () => {
      global.app.sdb = {} as any;

      const voted = await basic.vote.call(context, 'one', 'two', 'three');
      expect(voted).toEqual('Invalid arguments length');
    });

    it('should fail if passed 4 arguments', async () => {
      global.app.sdb = {} as any;

      const voted = await basic.vote.call(
        context,
        'one',
        'two',
        'three',
        'four'
      );
      expect(voted).toEqual('Invalid arguments length');
    });

    it('should return Invalid delegates', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const delegates = {}; // wront type
      const voted = await basic.vote.call(context, delegates);
      expect(voted).toEqual('Invalid delegates');
    });

    it('should return Account is not locked', async () => {
      context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 0,
        } as IAccount,
        block: {
          height: String(10),
        } as Pick<IBlock, 'height'>,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(oneAccount),
      } as any;

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Account is not locked');
    });

    it('should return Voting limit exceeded', async () => {
      delegates = '';
      for (let i = 0; i < 34; i++) {
        delegates += i + ',';
      }

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findOne: jest.fn().mockReturnValue(oneAccount),
      } as any;

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Voting limit exceeded');
    });

    it('should return Duplicated vote item', async () => {
      delegates = 'xpgeng,liangpeili,a1300,liangpeili';

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Duplicated vote item');
    });

    it('should return Maximum number of votes exceeded', async () => {
      delegates = '';
      for (let i = 0; i < 30; i++) {
        delegates += i + ',';
      }

      for (let i = 0; i < 70; i++) {
        currentVotes.push({ delegate: String(i) });
      }

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        exists: jest.fn().mockReturnValue(true),
        findAll: jest.fn().mockReturnValue(currentVotes),
        findOne: jest.fn().mockReturnValue(oneAccount),
      } as any;

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Maximum number of votes exceeded');
    });

    it('should return Already voted for delegate: xpgeng', async () => {
      currentVotes.push({ delegate: 'xpgeng' });

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        exists: jest.fn().mockReturnValue(true),
        findAll: jest.fn().mockReturnValue(currentVotes),
        findOne: jest.fn().mockReturnValue(oneAccount),
      } as any;

      console.log(JSON.stringify(context, null, 2));

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Already voted for delegate: xpgeng');
    });

    it('should return Voted delegate not exists: xpgeng', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findAll: jest.fn().mockReturnValue(currentVotes),
        exists: jest.fn().mockReturnValue(false),
        findOne: jest.fn().mockReturnValue(oneAccount),
      } as any;

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Voted delegate not exists: xpgeng');
    });
  });

  describe('unvote', () => {
    let delegates: string;
    let currentVotes: IVote[];
    let context: Context;

    beforeEach(done => {
      context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 1,
        } as IAccount,
      } as Context;

      delegates = 'xpgeng,liangpeili,a1300';

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
      jest.resetAllMocks();
      done();
    });

    it('should return null', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findAll: jest.fn().mockReturnValue(currentVotes),
        exists: jest.fn().mockReturnValue(true),
        increase: jest.fn().mockReturnValue(null),
        del: jest.fn().mockReturnValue(null),
      } as any;

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBeNull();
    });

    it('should fail if passed 0 argument', async () => {
      global.app.sdb = {} as any;

      const unvoted = await basic.unvote.call(context);
      expect(unvoted).toEqual('Invalid arguments length');
    });

    it('should fail if passed 2 arguments', async () => {
      global.app.sdb = {} as any;

      const unvoted = await basic.unvote.call(context, 'one', 'two');
      expect(unvoted).toEqual('Invalid arguments length');
    });

    it('should fail if passed 3 arguments', async () => {
      global.app.sdb = {} as any;

      const unvoted = await basic.unvote.call(context, 'one', 'two', 'three');
      expect(unvoted).toEqual('Invalid arguments length');
    });

    it('should fail if passed 4 arguments', async () => {
      global.app.sdb = {} as any;

      const unvoted = await basic.unvote.call(
        context,
        'one',
        'two',
        'three',
        'four'
      );
      expect(unvoted).toEqual('Invalid arguments length');
    });

    it('should return Invalid delegates', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const delegates = {}; // wront type
      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toEqual('Invalid delegates');
    });

    it('should return Account is not locked', async () => {
      // different context
      context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100000100),
          isLocked: 0,
        } as IAccount,
      } as Context;

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Account is not locked');
    });

    it('should return Voting limit exceeded', async () => {
      delegates = '';
      for (let i = 0; i < 34; i++) {
        delegates += i + ',';
      }

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Voting limit exceeded');
    });

    it('should return Duplicated vote item', async () => {
      delegates = 'xpgeng,liangpeili,a1300,liangpeili';

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
      } as any;

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Duplicated vote item');
    });

    it('should return Delegate not voted yet: a1300', async () => {
      currentVotes = [
        {
          voterAddress: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          delegate: 'xpgeng',
        },
        {
          voterAddress: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          delegate: 'liangpeili',
        },
      ];

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(null),
        findAll: jest.fn().mockReturnValue(currentVotes),
      } as any;

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Delegate not voted yet: a1300');
    });

    it('should return Voted delegate not exists: xpgeng', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(undefined),
        findAll: jest.fn().mockReturnValue(currentVotes),
        exists: jest.fn().mockReturnValue(false),
      } as any;

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Voted delegate not exists: xpgeng');
    });
  });

  describe('burn', () => {
    let context: Context;

    beforeEach(done => {
      context = {
        sender: {
          address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
          gny: String(100 * 1e8),
          isLocked: 1,
        } as IAccount,
        block: {
          height: String(1),
        } as Pick<IBlock, 'height'>,
        trs: {
          id: 'mytransactionid',
        },
      } as Context;

      done();
    });

    afterEach(done => {
      jest.resetAllMocks();
      done();
    });

    it('burn - calling with more than 1 arguments - throws error', async () => {
      const amount = String(100 * 1e8);
      const additialArgument = 'hello';

      const burned = await basic.burn.call(context, amount, additialArgument);
      expect(burned).toBe('Invalid arguments length');
    });

    it('burn - global.app.validate gets called - with wrong amount', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(undefined),
      } as any;

      const myMock = jest.fn().mockImplementation(() => {
        throw new Error('this is an error');
      });
      global.app.validate = myMock;

      const amount = 'hello';

      expect(() => basic.burn.call(context, amount)).rejects.toThrow(
        'this is an error'
      );

      expect(myMock).toBeCalledTimes(1);
      expect(myMock).toBeCalledWith('amount', 'hello');
    });

    it('burn - calls sdb.lock', async () => {
      const mock = jest.fn().mockImplementation(() => {});
      global.app.sdb = {
        lock: mock,
        increase: jest.fn().mockReturnValue(undefined),
        create: jest.fn().mockReturnValue(undefined),
      } as any;

      const amount = String(1 * 1e8);

      const burned = await basic.burn.call(context, amount);
      expect(burned).toEqual(null);

      expect(mock).toBeCalledTimes(1);
      const expectedAddress = 'GBR31pwhxvsgtrQDfzRxjfoPB62r';
      expect(mock).toBeCalledWith(`basic.burn@${expectedAddress}`);
    });

    it('burn - error if user wants to burn more than 1 million GNY', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(undefined),
        increase: jest.fn().mockReturnValue(undefined),
        create: jest.fn().mockReturnValue(undefined),
      } as any;

      // set account balance to 10 millionen
      context.sender.gny = String(10_000_000 * 1e8);

      const amount = String(1_000_001 * 1e8);

      const burned = await basic.burn.call(context, amount);
      expect(burned).toEqual('Only 1 million can be burned at once');
    });

    it('burn - can burn 1 millionen GNY at once', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(undefined),
        increase: jest.fn().mockReturnValue(undefined),
        create: jest.fn().mockReturnValue(undefined),
      } as any;

      // set account balance to 2 millionen
      context.sender.gny = String(2_000_000 * 1e8);

      const amount = String(1_000_000 * 1e8);

      const burned = await basic.burn.call(context, amount);
      expect(burned).toEqual(null);
    });

    it('burn - throws if balance is not sufficient', async () => {
      global.app.sdb = {
        lock: jest.fn().mockReturnValue(undefined),
        increase: jest.fn().mockReturnValue(undefined),
        create: jest.fn().mockReturnValue(undefined),
      } as any;

      // set account balance to 500 GNY
      context.sender.gny = String(500 * 1e8);

      // 500 - 0.1 fee < 500
      const amount = String(500 * 1e8);

      const burned = await basic.burn.call(context, amount);
      expect(burned).toEqual('Insufficient balance');
    });

    it('burn - calls sdb.create when successfully creating a Burn object', async () => {
      const createMock = jest.fn().mockImplementation(() => {});

      global.app.sdb = {
        lock: jest.fn().mockReturnValue(undefined),
        increase: jest.fn().mockReturnValue(undefined),
        create: createMock,
      } as any;

      // set account balance to 100 GNY
      context.sender.gny = String(100 * 1e8);

      const amount = String(50 * 1e8);

      const burned = await basic.burn.call(context, amount);
      expect(burned).toEqual(null);

      expect(createMock).toBeCalledTimes(1);
    });
  });
});
