import * as gnyJS from '../../../packages/gny-js';
import * as lib from '../lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

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
  });

  describe('unlock', () => {
    it(
      'should unlock the sender account',
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
  });

  describe('unvote', () => {
    it(
      'should unvote the delegates',
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
        // vote
        const voteTrs = gnyJS.basic.vote(['xpgeng'], genesisSecret);
        const voteTransData = {
          transaction: voteTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          voteTransData,
          config
        );
        await lib.onNewBlock();

        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);
        await lib.onNewBlock();

        // Unvote
        const trs = gnyJS.basic.unvote(['xpgeng'], genesisSecret);

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
  });
});
