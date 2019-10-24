import * as gnyClient from '@gny/client';
import * as lib from './lib';
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
      'return error: "offset" must be a number',
      async () => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';
        const offset1 = 1;
        const offset2 = 2;

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

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const transPromise = axios.get(
          'http://localhost:4096/api/transactions?senderId=' +
            senderId +
            '&offset=' +
            offset1 +
            '&offset=' +
            offset2
        );
        expect(transPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "offset" fails because ["offset" must be a number]',
        });
        expect(transPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );

    it(
      'should return: "limit" must be a number',
      async () => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';
        const limit1 = 10;
        const limit2 = 11;
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

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const transPromise = axios.get(
          'http://localhost:4096/api/transactions?senderId=' +
            senderId +
            '&limit=' +
            limit1 +
            '&limit=' +
            limit2
        );
        expect(transPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "limit" fails because ["limit" must be a number]',
        });
        expect(transPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );
  });
});
