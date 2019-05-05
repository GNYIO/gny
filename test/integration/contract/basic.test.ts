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
    it('should transfer to a recipient account', async done => {
      const amount = 5 * 1e8;
      const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
      const message = '';

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
      done();
    });
  });

  describe('setUserName', () => {
    it('should set the user name', async done => {
      const username = 'xpgeng';

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
      done();
    });
  });

  describe('lock', () => {
    it('should lock the sender with an amount according to the height', async done => {
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
      done();
    });
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
      },
      lib.oneMinute
    );

    it(
      'should return error if usename is not set',
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
      },
      lib.oneMinute
    );
  });
});
