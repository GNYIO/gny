import * as gnyJS from '../../../packages/gny-js';
import * as lib from '../lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

function createAddress(secret) {
  const keys = gnyJS.crypto.getKeys(secret);
  return gnyJS.crypto.getAddress(keys.publicKey);
}

async function voteUser(name) {
  // set username
  const username = name;
  const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
  const nameTransData = {
    transaction: nameTrs,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    nameTransData,
    config
  );
  await lib.onNewBlock();

  // lock the account
  const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
  const lockTransData = {
    transaction: lockTrs,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    lockTransData,
    config
  );
  await lib.onNewBlock();

  // register delegate
  const delegateTrs = gnyJS.basic.registerDelegate(genesisSecret);
  const delegateTransData = {
    transaction: delegateTrs,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    delegateTransData,
    config
  );
  await lib.onNewBlock();
  // vote
  const voteTrs = gnyJS.basic.vote([username], genesisSecret);
  const voteTransData = {
    transaction: voteTrs,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    voteTransData,
    config
  );
  await lib.onNewBlock();
}

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('basic', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, lib.oneMinute);

  describe('transfer', () => {
    it(
      'should transfer to a recipient account',
      async () => {
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';

        // Check the balance before the transaction
        const beforeTrs = await axios.get(
          'http://localhost:4096/api/accounts/getBalance?address=' + recipient
        );
        expect(beforeTrs.data.balances[0].gny).toBe(0);
        await lib.onNewBlock();

        // Transaction
        const trs = gnyJS.basic.transfer(
          recipient,
          amount,
          message,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();

        // Check the balance after the transaction
        const afterTrs = await axios.get(
          'http://localhost:4096/api/accounts/getBalance?address=' + recipient
        );
        expect(afterTrs.data.balances[0].gny).toBe(String(5 * 1e8));
      },
      lib.oneMinute
    );

    it(
      'should return recipient name not exist',
      async () => {
        const senderId = createAddress(genesisSecret);
        const amount = 5 * 1e8;
        const recipient = 'guQr4DM3aiTD36EARqDpbfsEHoNF'; // wrong recipient
        const message = '';

        // Check the balance before the transaction
        const beforeTrs = await axios.get(
          'http://localhost:4096/api/accounts/getBalance?address=' + senderId
        );
        expect(beforeTrs.data.balances[0].gny).toBe('40000000000000000');
        await lib.onNewBlock();

        // Transaction
        const trs = gnyJS.basic.transfer(
          recipient,
          amount,
          message,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const transferPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Recipient name not exist',
        });

        await lib.onNewBlock();

        // Check the balance after the transaction
        const afterTrs = await axios.get(
          'http://localhost:4096/api/accounts/getBalance?address=' + senderId
        );
        expect(afterTrs.data.balances[0].gny).toBe('40000000000000000');
      },
      lib.oneMinute
    );
  });

  describe('setUserName', () => {
    it(
      'should set the user name',
      async () => {
        const username = 'xpgeng';

        const beforeset = await axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        expect(beforeset.data).toHaveLength(0);
        await lib.onNewBlock();

        const trs = gnyJS.basic.setUserName(username, genesisSecret);
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();
        const afterset = await axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        expect(afterset.data.username).toBe(username);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Name already registered',
      async () => {
        const username = 'xpgeng';

        const beforeset = await axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        expect(beforeset.data).toHaveLength(0);
        await lib.onNewBlock();

        const trs = gnyJS.basic.setUserName(username, genesisSecret);
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();

        // set the same username twice

        const trsTwice = gnyJS.basic.setUserName(username, genesisSecret);
        const transTwiceData = {
          transaction: trsTwice,
        };

        const setPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );
        expect(setPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Name already registered',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Name already set',
      async () => {
        const username = 'xpgeng';

        const beforeset = await axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        expect(beforeset.data).toHaveLength(0);
        await lib.onNewBlock();

        const trs = gnyJS.basic.setUserName(username, genesisSecret);
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();

        // set the another username to same account
        const anotherName = 'liang';

        const trsTwice = gnyJS.basic.setUserName(anotherName, genesisSecret);
        const transTwiceData = {
          transaction: trsTwice,
        };

        const setPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );
        expect(setPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Name already set',
        });
      },
      lib.oneMinute
    );
  });

  describe('lock', () => {
    it(
      'should lock the sender with an amount according to the height',
      async () => {
        // Before lock
        const keys = gnyJS.crypto.getKeys(genesisSecret);
        const senderId = gnyJS.crypto.getAddress(keys.publicKey);
        const beforeLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + senderId
        );
        expect(beforeLock.data.account.lockHeight).toBe('0');
        await lib.onNewBlock();

        // lock
        const trs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);

        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.account.lockHeight).toBe(String(173000));
      },
      lib.oneMinute
    );

    it(
      'should return the error: Height should be positive integer',
      async () => {
        // lock
        const trs = gnyJS.basic.lock(0, 30 * 1e8, genesisSecret);

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Height should be positive integer',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.account.lockHeight).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'should return the error: Insufficient balance',
      async () => {
        // lock
        const trs = gnyJS.basic.lock(173000, 40 * 1e16, genesisSecret);

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Insufficient balance',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.account.lockHeight).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid lock height',
      async () => {
        // lock
        const trs = gnyJS.basic.lock(17300, 30 * 1e8, genesisSecret);

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid lock height',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.account.lockHeight).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid amount',
      async () => {
        // lock
        const trs = gnyJS.basic.lock(173000, 0, genesisSecret);

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid amount',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.account.lockHeight).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid lock height, when the sender has been locked',
      async () => {
        // lock the sender before locking again
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);

        const transLockData = {
          transaction: lockTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transLockData,
          config
        );
        await lib.onNewBlock();

        // lock
        const trs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid lock height',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.account.lockHeight).toBe('173000');
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid amount, when the sender has been locked',
      async () => {
        // lock the sender before locking again
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);

        const transLockData = {
          transaction: lockTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transLockData,
          config
        );
        await lib.onNewBlock();

        // lock
        const trs = gnyJS.basic.lock(173000 * 2 + 20, 0, genesisSecret);

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid amount',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.account.lockHeight).toBe('173000');
      },
      lib.oneMinute
    );
  });

  describe('unlock', () => {
    it(
      'cannot unlock the sender account',
      async () => {
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
        const lockTransData = {
          transaction: lockTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          lockTransData,
          config
        );
        await lib.onNewBlock();

        // After lock
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + lockTrs.senderId
        );
        expect(afterLock.data.account.lockHeight).toBe(String(173000));
        await lib.onNewBlock();

        // unlock
        const trs = gnyJS.basic.unlock(genesisSecret);
        const transData = {
          transaction: trs,
        };

        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Account cannot unlock',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Account is not locked',
      async () => {
        const trs = gnyJS.basic.unlock(genesisSecret);
        const transData = {
          transaction: trs,
        };

        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Account is not locked',
        });
      },
      lib.oneMinute
    );
  });

  describe('registerDelegate', () => {
    it(
      'should register the delegate',
      async () => {
        const username = 'xpgeng';

        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // Before register
        const beforeRegister = await axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        expect(beforeRegister.data.isDelegate).toBe(0);
        await lib.onNewBlock();

        // Register the delegate
        const trs = gnyJS.basic.registerDelegate(genesisSecret);

        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');
        await lib.onNewBlock();

        // After register
        const afterRegister = await axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        expect(afterRegister.data.isDelegate).toBe(1);
      },
      lib.oneMinute
    );

    it(
      'should return error if username is not set',
      async () => {
        const trs = gnyJS.basic.registerDelegate(genesisSecret);

        const transData = {
          transaction: trs,
        };

        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Account has not a name',
        });
      },
      lib.oneMinute
    );

    it(
      'should return error if the account is already delegated',
      async () => {
        // set username
        const username = 'xpgeng';

        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // register the delegate first
        const regTrs = gnyJS.basic.registerDelegate(genesisSecret);

        const transRegData = {
          transaction: regTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transRegData,
          config
        );

        await lib.onNewBlock();
        // register the delegate twice
        const trs = gnyJS.basic.registerDelegate(genesisSecret);

        const transData = {
          transaction: trs,
        };

        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Account is already Delegate',
        });
      },
      lib.oneMinute
    );
  });

  describe('vote', () => {
    it(
      'should vote the delegates',
      async () => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // lock the account
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          lockTransData,
          config
        );
        await lib.onNewBlock();

        // register delegate
        const delegateTrs = gnyJS.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          delegateTransData,
          config
        );
        await lib.onNewBlock();

        // Before vote
        const beforeVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(beforeVote.data.delegates).toHaveLength(0);
        await lib.onNewBlock();

        const trs = gnyJS.basic.vote(['xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();
        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Account is not locked',
      async () => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // register delegate
        const delegateTrs = gnyJS.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          delegateTransData,
          config
        );
        await lib.onNewBlock();

        // Before vote
        const beforeVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(beforeVote.data.delegates).toHaveLength(0);
        await lib.onNewBlock();

        // vote
        const trs = gnyJS.basic.vote(['xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(votePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Account is not locked',
        });

        await lib.onNewBlock();
        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(0);
      },
      lib.oneMinute
    );

    it.skip('should return the error: Invalid delegates', async () => {});

    it(
      'should return the error: Voting limit exceeded',
      async () => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // lock the account
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          lockTransData,
          config
        );
        await lib.onNewBlock();

        // register delegate
        const delegateTrs = gnyJS.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          delegateTransData,
          config
        );
        await lib.onNewBlock();

        // Before vote
        const beforeVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(beforeVote.data.delegates).toHaveLength(0);
        await lib.onNewBlock();

        // vote
        let delegates = '';
        for (let i = 0; i < 34; i++) {
          delegates += 'xpgeng' + i + ',';
        }
        const trs = gnyJS.basic.vote([delegates], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(votePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Voting limit exceeded',
        });

        await lib.onNewBlock();
        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(0);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Duplicated vote item',
      async () => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // lock the account
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          lockTransData,
          config
        );
        await lib.onNewBlock();

        // register delegate
        const delegateTrs = gnyJS.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          delegateTransData,
          config
        );
        await lib.onNewBlock();

        // Before vote
        const beforeVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(beforeVote.data.delegates).toHaveLength(0);
        await lib.onNewBlock();

        // vote
        const trs = gnyJS.basic.vote(['xpgeng,xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(votePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Duplicated vote item',
        });

        await lib.onNewBlock();
        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(0);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Already voted for delegate',
      async () => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // lock the account
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          lockTransData,
          config
        );
        await lib.onNewBlock();

        // register delegate
        const delegateTrs = gnyJS.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          delegateTransData,
          config
        );
        await lib.onNewBlock();

        // Before vote
        const beforeVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(beforeVote.data.delegates).toHaveLength(0);
        await lib.onNewBlock();

        // vote first time
        const trs = gnyJS.basic.vote(['xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        // vote twice
        const trsTwice = gnyJS.basic.vote(['xpgeng'], genesisSecret);

        const transTwiceData = {
          transaction: trsTwice,
        };
        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );

        expect(votePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Already voted for delegate: xpgeng',
        });

        await lib.onNewBlock();
        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);
      },
      lib.oneMinute
    );

    it.skip('should return the error: Maximum number of votes exceeded', async () => {});

    it(
      'should return the error: Voted delegate not exists',
      async () => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // lock the account
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          lockTransData,
          config
        );
        await lib.onNewBlock();

        // Before vote
        const beforeVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(beforeVote.data.delegates).toHaveLength(0);
        await lib.onNewBlock();

        // vote
        const trs = gnyJS.basic.vote(['xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(votePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Voted delegate not exists: xpgeng',
        });

        await lib.onNewBlock();
        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(0);
      },
      lib.oneMinute
    );
  });

  describe('unvote', () => {
    it(
      'should unvote the delegates',
      async () => {
        const username = 'xpgeng';
        await voteUser(username);

        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);
        await lib.onNewBlock();

        // Unvote
        const trs = gnyJS.basic.unvote([username], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');
        await lib.onNewBlock();

        // After unvote
        const afterUnvote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterUnvote.data.delegates).toHaveLength(0);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Delegate not voted yet',
      async () => {
        const username = 'xpgeng';
        await voteUser(username);

        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);
        await lib.onNewBlock();

        // unvote first time
        const trs = gnyJS.basic.unvote([username], genesisSecret);

        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        // Unvote twice
        const trsTwice = gnyJS.basic.unvote([username], genesisSecret);

        const transTwiceData = {
          transaction: trsTwice,
        };

        const unvotePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );

        expect(unvotePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Delegate not voted yet: xpgeng',
        });
        await lib.onNewBlock();

        // After unvote
        const afterUnvote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterUnvote.data.delegates).toHaveLength(0);
      },
      lib.oneMinute * 2
    );
  });
});
