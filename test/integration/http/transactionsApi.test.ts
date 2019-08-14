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

describe('transactionsApi', () => {
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

  describe('/', () => {
    it(
      'should get transations',
      async done => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';

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

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/transactions?senderId=' + senderId
        );
        expect(data).toHaveProperty('transactions');
        done();
      },
      lib.oneMinute
    );

    it(
      'return error: "offset" must be larger than or equal to 0',
      async () => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';
        const offset = -1;

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

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const promise = axios.get(
          'http://localhost:4096/api/transactions?senderId=' +
            senderId +
            '&offset=' +
            offset
        );
        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "offset" fails because ["offset" must be larger than or equal to 0]',
        });
      },
      lib.oneMinute
    );

    it(
      'should return: "limit" must be less than or equal to 100',
      async () => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';
        const limit = 101;

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

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const promise = axios.get(
          'http://localhost:4096/api/transactions?senderId=' +
            senderId +
            '&limit=' +
            limit
        );
        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "limit" fails because ["limit" must be less than or equal to 100]',
        });
      },
      lib.oneMinute
    );
  });
});
