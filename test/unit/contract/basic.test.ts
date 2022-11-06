import basic from '../../../packages/main/src/contract/basic';
import {
  ILogger,
  IAccount,
  IBlock,
  ITransaction,
  Context,
  IVote,
} from '../../../packages/interfaces/src/index';
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
      sdb: new SmartDB(logger),
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

      (global.app.sdb.increase as jest.Mock).mockReturnValue(recipientAccount);
      (global.app.sdb.load as jest.Mock).mockReturnValue(recipientAccount);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);
      (global.app.sdb.load as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);
      (global.app.sdb.load as jest.Mock).mockReturnValue(account);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);
      (global.app.sdb.load as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findAll as jest.Mock).mockReturnValue([vote]);
      (global.app.sdb.increase as jest.Mock).mockReturnValue(null);

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

      const locked = await basic.lock.call(context, height, amount);
      expect(locked).toBe('Invalid amount');
    });
  });

  describe('unlock', () => {
    afterEach(done => {
      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

      const unlocked = await basic.unlock.call(context);
      expect(unlocked).toBe('Account cannot unlock');
    });
  });

  describe('registerDelegate', () => {
    afterEach(done => {
      delete (basic as any).sender;
      delete (basic as any).block;
      delete (basic as any).trs;

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.create as jest.Mock).mockReturnValue(null);
      (global.app.sdb.update as jest.Mock).mockReturnValue(null);

      const registered = await basic.registerDelegate.call(context);
      expect(registered).toBeNull();
    });

    it('should return Account not found', async () => {
      const context = {
        sender: undefined as unknown,
      } as Context;

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

      const registered = await basic.registerDelegate.call(context);
      expect(registered).toBe('Account not found');
    });

    it('should return Account not found', async () => {
      const context = {
        sender: undefined as unknown,
      } as Context;

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

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

      done();
    });

    it('should return null', async () => {
      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findAll as jest.Mock).mockReturnValue(currentVotes);
      (global.app.sdb.exists as jest.Mock).mockReturnValue(true);
      (global.app.sdb.increase as jest.Mock).mockReturnValue(null);
      (global.app.sdb.create as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findOne as jest.Mock).mockReturnValue(oneAccount);

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBeNull();
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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findOne as jest.Mock).mockReturnValue(oneAccount);

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Account is not locked');
    });

    it('should return Voting limit exceeded', async () => {
      delegates = '';
      for (let i = 0; i < 34; i++) {
        delegates += i + ',';
      }

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findOne as jest.Mock).mockReturnValue(oneAccount);

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Voting limit exceeded');
    });

    it('should return Duplicated vote item', async () => {
      delegates = 'xpgeng,liangpeili,a1300,liangpeili';

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findAll as jest.Mock).mockReturnValue(currentVotes);
      (global.app.sdb.findOne as jest.Mock).mockReturnValue(oneAccount);

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Maximum number of votes exceeded');
    });

    it('should return Already voted for delegate: xpgeng', async () => {
      currentVotes.push({ delegate: 'xpgeng' });

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findAll as jest.Mock).mockReturnValue(currentVotes);
      (global.app.sdb.findOne as jest.Mock).mockReturnValue(oneAccount);

      const voted = await basic.vote.call(context, delegates);
      expect(voted).toBe('Already voted for delegate: xpgeng');
    });

    it('should return Voted delegate not exists: xpgeng', async () => {
      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findAll as jest.Mock).mockReturnValue(currentVotes);
      (global.app.sdb.exists as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findOne as jest.Mock).mockReturnValue(oneAccount);

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
      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findAll as jest.Mock).mockReturnValue(currentVotes);
      (global.app.sdb.exists as jest.Mock).mockReturnValue(true);
      (global.app.sdb.increase as jest.Mock).mockReturnValue(null);
      (global.app.sdb.del as jest.Mock).mockReturnValue(null);

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBeNull();
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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Account is not locked');
    });

    it('should return Voting limit exceeded', async () => {
      delegates = '';
      for (let i = 0; i < 34; i++) {
        delegates += i + ',';
      }

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Voting limit exceeded');
    });

    it('should return Duplicated vote item', async () => {
      delegates = 'xpgeng,liangpeili,a1300,liangpeili';

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);

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

      (global.app.sdb.lock as jest.Mock).mockReturnValue(null);
      (global.app.sdb.findAll as jest.Mock).mockReturnValue(currentVotes);

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Delegate not voted yet: a1300');
    });

    it('should return Voted delegate not exists: xpgeng', async () => {
      (global.app.sdb.lock as jest.Mock).mockReturnValue(undefined);
      (global.app.sdb.findAll as jest.Mock).mockReturnValue(currentVotes);
      (global.app.sdb.exists as jest.Mock).mockReturnValue(null);

      const unvoted = await basic.unvote.call(context, delegates);
      expect(unvoted).toBe('Voted delegate not exists: xpgeng');
    });
  });
});
