import * as gnyClient from '@gny/client';
import * as lib from '../../e2e/lib';
import axios from 'axios';
import * as crypto from 'crypto';
import { log as consoleLog } from 'console';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

async function getInfoToTransactionId(transactionId: string) {
  try {
    const { data } = await axios.get(
      'http://localhost:4096/api/transactions?id=' + transactionId
    );
    return data;
  } catch (err) {
    throw new Error(
      'could not get information to transactionId: ' + transactionId
    );
  }
}

function createRandomAddress() {
  const randomString = crypto.randomBytes(64).toString('hex');
  return createAddress(randomString);
}

function createAddress(secret) {
  const keys = gnyClient.crypto.getKeys(secret);
  return gnyClient.crypto.getAddress(keys.publicKey);
}

async function voteUser(name) {
  // set username
  const username = name;
  const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
  const lockTrs = gnyClient.basic.lock(
    String(173000),
    String(187500 * 1e8),
    genesisSecret
  );
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
  const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
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
  const voteTrs = gnyClient.basic.vote([username], genesisSecret);
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
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

const DOCKER_COMPOSE_P2P = 'config/integration/docker-compose.integration.yml';

describe('basic', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096]);

    consoleLog(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute);

  afterEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] stopping...`);

    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    consoleLog(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute);

  describe('transfer', () => {
    it(
      'should transfer to a recipient account',
      async () => {
        expect.assertions(3);
        await lib.waitForApiToBeReadyReady(4096);

        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';

        // Check the balance before the transaction
        const beforeTrs = await axios.get(
          'http://localhost:4096/api/accounts/getBalance?address=' + recipient
        );
        expect(beforeTrs.data.balances[0].gny).toBe(String(0));

        // Transaction
        const trs = gnyClient.basic.transfer(
          recipient,
          String(amount),
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
      2 * lib.oneMinute
    );

    it(
      'should return recipient name not exist',
      async () => {
        expect.assertions(3);
        await lib.waitForApiToBeReadyReady(4096);

        const senderId = createAddress(genesisSecret);
        const amount = 5 * 1e8;
        const recipient = 'guQr4DM3aiTD36EARqDpbfsEHoNF'; // wrong recipient
        const message = '';

        // Check the balance before the transaction
        const beforeTrs = await axios.get(
          'http://localhost:4096/api/accounts/getBalance?address=' + senderId
        );
        expect(beforeTrs.data.balances[0].gny).toBe(
          String('40000000000000000')
        );
        await lib.onNewBlock();

        // Transaction
        const trs = gnyClient.basic.transfer(
          recipient,
          String(amount),
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
        await expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Recipient name not exist',
        });

        await lib.onNewBlock();

        // Check the balance after the transaction
        const afterTrs = await axios.get(
          'http://localhost:4096/api/accounts/getBalance?address=' + senderId
        );
        expect(afterTrs.data.balances[0].gny).toBe(String('40000000000000000'));
      },
      2 * lib.oneMinute
    );

    it(
      'should return error: invalid recipient, if recipient address is equal to sender address',
      async () => {
        expect.assertions(1);
        await lib.waitForApiToBeReadyReady(4096);
        await lib.sleep(10 * 1000);

        const amount = 5 * 1e8;
        const recipient = 'G2ofFMDz8GtWq9n65khKit83bWkQr';
        const message = '';

        // Transaction
        const trs = gnyClient.basic.transfer(
          recipient,
          String(amount),
          message,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const transferPromise = axios.post(
          'http://127.0.0.1:4096/peer/transactions',
          transData,
          config
        );
        return expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid recipient',
        });
      },
      2 * lib.oneMinute
    );

    it(
      'should return error: invalid recipient, if recipient username is equal to sender username',
      async () => {
        expect.assertions(1);
        await lib.sleep(10 * 1000);

        const amount = 5 * 1e8;
        const username = 'a1300';
        const recipient = 'a1300';
        const message = '';

        // set usename
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          'http://127.0.0.1:4096/peer/transactions',
          nameTransData,
          config
        );

        await lib.onNewBlock();
        await lib.onNewBlock();

        // Transaction
        const trs = gnyClient.basic.transfer(
          recipient,
          String(amount),
          message,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const transferPromise = axios.post(
          'http://127.0.0.1:4096/peer/transactions',
          transData,
          config
        );
        return expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid recipient',
        });
      },
      2 * lib.oneMinute
    );
  });

  describe('setUserName', () => {
    it(
      'should set the user name',
      async () => {
        expect.assertions(4);
        await lib.waitForApiToBeReadyReady(4096);

        const username = 'xpgeng';

        const beforesetPromise = axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        await expect(beforesetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'account with this username not found',
        });

        const trs = gnyClient.basic.setUserName(username, genesisSecret);
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
      2 * lib.oneMinute
    );

    it(
      'should return the error: Name already registered',
      async () => {
        expect.assertions(4);
        await lib.waitForApiToBeReadyReady(4096);

        const username = 'xpgeng';

        const beforesetPromise = axios.get(
          'http://127.0.0.1:4096/api/accounts?username=' + username
        );
        await expect(beforesetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'account with this username not found',
        });
        await lib.onNewBlock();

        const trs = gnyClient.basic.setUserName(username, genesisSecret);
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://127.0.0.1:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();

        // set the same username twice

        const trsTwice = gnyClient.basic.setUserName(username, genesisSecret);
        const transTwiceData = {
          transaction: trsTwice,
        };

        const setPromise = axios.post(
          'http://127.0.0.1:4096/peer/transactions',
          transTwiceData,
          config
        );
        return expect(setPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Name already registered',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Name already set',
      async () => {
        expect.assertions(4);
        await lib.waitForApiToBeReadyReady(4096);

        const username = 'xpgeng';
        const beforesetPromise = axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        await expect(beforesetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'account with this username not found',
        });
        await lib.onNewBlock();

        const trs = gnyClient.basic.setUserName(username, genesisSecret);
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

        const trsTwice = gnyClient.basic.setUserName(
          anotherName,
          genesisSecret
        );
        const transTwiceData = {
          transaction: trsTwice,
        };

        const setPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );
        return expect(setPromise).rejects.toHaveProperty('response.data', {
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
        expect.assertions(4);
        await lib.waitForApiToBeReadyReady(4096);

        // Before lock
        const keys = gnyClient.crypto.getKeys(genesisSecret);
        const senderId = gnyClient.crypto.getAddress(keys.publicKey);
        const beforeLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + senderId
        );
        expect(beforeLock.data.lockHeight).toBe('0');
        await lib.onNewBlock();

        // lock
        const trs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
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

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.lockHeight).toBe(String(173000));
      },
      lib.oneMinute
    );

    it(
      'trying to lock amount till height "0" returns error',
      async () => {
        expect.assertions(2);
        await lib.waitForApiToBeReadyReady(4096);

        // lock
        const trs = gnyClient.basic.lock(
          String(0),
          String(30 * 1e8),
          genesisSecret
        );

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Amount should be positive integer',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.lockHeight).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'should return the error: Insufficient balance',
      async () => {
        expect.assertions(2);
        await lib.waitForApiToBeReadyReady(4096);

        // lock
        const trs = gnyClient.basic.lock(
          String(173000),
          String(40 * 1e16),
          genesisSecret
        );

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Insufficient balance',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.lockHeight).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'locking account below the MIN_LOCK_HEIGHT returns error',
      async () => {
        expect.assertions(2);
        await lib.waitForApiToBeReadyReady(4096);

        // lock
        const trs = gnyClient.basic.lock(
          String(17300),
          String(30 * 1e8),
          genesisSecret
        );

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid lock height',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.lockHeight).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'trying to lock account with amount "0" results in error',
      async () => {
        expect.assertions(2);
        await lib.waitForApiToBeReadyReady(4096);

        // lock
        const trs = gnyClient.basic.lock(
          String(173000),
          String(0),
          genesisSecret
        );

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Amount should be positive integer',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.lockHeight).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'trying to lock account two times with same height returns error',
      async () => {
        expect.assertions(2);
        await lib.waitForApiToBeReadyReady(4096);

        // lock the sender before locking again
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );

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
        const trs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid lock height',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.lockHeight).toBe('173000');
      },
      lib.oneMinute
    );

    it(
      'locking account a second time with an amount of "0" should return error',
      async () => {
        expect.assertions(2);
        await lib.waitForApiToBeReadyReady(4096);

        // lock the sender before locking again
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );

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
        const trs = gnyClient.basic.lock(
          String(173000 * 2 + 20),
          String(0),
          genesisSecret
        );

        const transData = {
          transaction: trs,
        };

        const lockPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(lockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Amount should be positive integer',
        });

        // After lock
        await lib.onNewBlock();
        const afterLock = await axios.get(
          'http://localhost:4096/api/accounts?address=' + trs.senderId
        );
        expect(afterLock.data.lockHeight).toBe('173000');
      },
      lib.oneMinute
    );
  });

  describe('unlock', () => {
    it(
      'cannot unlock the sender account',
      async () => {
        expect.assertions(2);
        await lib.waitForApiToBeReadyReady(4096);

        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );
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
        expect(afterLock.data.lockHeight).toBe(String(173000));
        await lib.onNewBlock();

        // unlock
        const trs = gnyClient.basic.unlock(genesisSecret);
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
        expect.assertions(1);
        await lib.waitForApiToBeReadyReady(4096);

        const trs = gnyClient.basic.unlock(genesisSecret);
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
        expect.assertions(4);
        await lib.waitForApiToBeReadyReady(4096);

        const username = 'xpgeng';

        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
        const trs = gnyClient.basic.registerDelegate(genesisSecret);

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
        expect.assertions(1);
        await lib.waitForApiToBeReadyReady(4096);

        const trs = gnyClient.basic.registerDelegate(genesisSecret);

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
        expect.assertions(1);
        await lib.waitForApiToBeReadyReady(4096);

        // set username
        const username = 'xpgeng';

        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
        const regTrs = gnyClient.basic.registerDelegate(genesisSecret);

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
        const trs = gnyClient.basic.registerDelegate(genesisSecret);

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
        expect.assertions(4);
        await lib.waitForApiToBeReadyReady(4096);

        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(187500 * 1e8),
          genesisSecret
        );
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
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
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

        const trs = gnyClient.basic.vote(['xpgeng'], genesisSecret);

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
        expect.assertions(3);
        await lib.waitForApiToBeReadyReady(4096);

        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
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
        const trs = gnyClient.basic.vote(['xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(votePromise).rejects.toHaveProperty('response.data', {
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
        expect.assertions(3);
        await lib.waitForApiToBeReadyReady(4096);

        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );
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
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
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
        const trs = gnyClient.basic.vote([delegates], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(votePromise).rejects.toHaveProperty('response.data', {
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
        expect.assertions(3);
        await lib.waitForApiToBeReadyReady(4096);

        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );
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
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
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
        const trs = gnyClient.basic.vote(['xpgeng,xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(votePromise).rejects.toHaveProperty('response.data', {
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
        expect.assertions(3);
        await lib.waitForApiToBeReadyReady(4096);

        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(187500 * 1e8),
          genesisSecret
        );
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
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
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
        const trs = gnyClient.basic.vote(['xpgeng'], genesisSecret);

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
        const trsTwice = gnyClient.basic.vote(['xpgeng'], genesisSecret);

        const transTwiceData = {
          transaction: trsTwice,
        };
        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );

        await expect(votePromise).rejects.toHaveProperty('response.data', {
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
      2 * lib.oneMinute
    );

    it.skip('should return the error: Maximum number of votes exceeded', async () => {});

    it(
      'should return the error: Voted delegate not exists',
      async () => {
        expect.assertions(3);
        await lib.waitForApiToBeReadyReady(4096);

        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
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
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(187500 * 1e8),
          genesisSecret
        );
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
        const trs = gnyClient.basic.vote(['xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const votePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        await expect(votePromise).rejects.toHaveProperty('response.data', {
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
        expect.assertions(4);
        await lib.waitForApiToBeReadyReady(4096);

        const username = 'xpgeng';
        await voteUser(username);

        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);
        await lib.onNewBlock();

        // Unvote
        const trs = gnyClient.basic.unvote([username], genesisSecret);

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
      2 * lib.oneMinute
    );

    it(
      'should return the error: Delegate not voted yet',
      async () => {
        expect.assertions(3);
        await lib.waitForApiToBeReadyReady(4096);

        const username = 'xpgeng';
        await voteUser(username);

        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);
        await lib.onNewBlock();

        // unvote first time
        const trs = gnyClient.basic.unvote([username], genesisSecret);

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
        const trsTwice = gnyClient.basic.unvote([username], genesisSecret);

        const transTwiceData = {
          transaction: trsTwice,
        };

        const unvotePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );

        await expect(unvotePromise).rejects.toHaveProperty('response.data', {
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

  describe('testing basic contract locking functionality', () => {
    it(
      'successfully invoke two different basic.transfer transactions in one block',
      async () => {
        expect.assertions(7);
        await lib.waitForApiToBeReadyReady(4096);

        const recipient1 = createRandomAddress();
        const basicTransfer1 = gnyClient.basic.transfer(
          recipient1,
          String(10 * 1e8),
          undefined,
          genesisSecret
        );
        const transData1 = {
          transaction: basicTransfer1,
        };

        const recipient2 = createRandomAddress();
        const basicTransfer2 = gnyClient.basic.transfer(
          recipient2,
          String(20 * 1e8),
          undefined,
          genesisSecret
        );
        const transData2 = {
          transaction: basicTransfer2,
        };

        // wait on newBlock
        await lib.onNewBlock();

        // send first
        const basicTransferPromise1 = axios.post(
          'http://localhost:4096/peer/transactions',
          transData1,
          config
        );
        // send second
        const basicTransferPromise2 = axios.post(
          'http://localhost:4096/peer/transactions',
          transData2,
          config
        );

        const [result1, result2] = await Promise.all([
          basicTransferPromise1,
          basicTransferPromise2,
        ]);

        expect(result1).toHaveProperty('data.transactionId');
        expect(result2).toHaveProperty('data.transactionId');

        // imporant, wait until transactions are written to db
        await lib.onNewBlock();

        const info1 = await getInfoToTransactionId(result1.data.transactionId);
        const info2 = await getInfoToTransactionId(result2.data.transactionId);

        expect(info1.transactions).toHaveLength(1);
        expect(info2.transactions).toHaveLength(1);
        expect(info1.transactions[0]).toHaveProperty(
          'id',
          result1.data.transactionId
        );
        expect(info2.transactions[0]).toHaveProperty(
          'id',
          result2.data.transactionId
        );
        // need to have same height
        expect(info1.transactions[0].height).toEqual(
          info2.transactions[0].height
        );
      },
      lib.oneMinute * 2
    );
  });

  describe('burn', () => {
    it(
      'burn 100 GNY',
      async () => {
        await lib.waitForApiToBeReadyReady(4096);

        const targetSecret =
          'flame plunge lift minor ozone aisle violin life mystery lion bid repeat';
        const targetAddress = createAddress(targetSecret);

        const basicTransfer = gnyClient.basic.transfer(
          targetAddress,
          String(120 * 1e8),
          undefined,
          genesisSecret
        );
        const basicTransferData = {
          transaction: basicTransfer,
        };

        const transferResult = await axios.post(
          'http://localhost:4096/peer/transactions',
          basicTransferData,
          config
        );
        console.log(transferResult.data);
        await lib.onNewBlock();

        const burnTrs = gnyClient.basic.burn(String(100 * 1e8), targetSecret);
        const burnTrsData = {
          transaction: burnTrs,
        };
        const burnResult = await axios.post(
          'http://localhost:4096/peer/transactions',
          burnTrsData,
          config
        );
        console.log(burnResult.data);
      },
      lib.oneMinute * 2
    );
  });
});
