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

describe('transfersApi', () => {
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
      'should return data with default setting: offset = 0',
      async () => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';
        const limit = 5;
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

        const { data } = await axios.get(
          'http://localhost:4096/api/transfers?ownerId=' +
            senderId +
            '&limit=' +
            limit +
            '&offset=' +
            offset1 +
            '&offset=' +
            offset2
        );
        expect(data.count).toBeLessThanOrEqual(limit);
      },
      lib.oneMinute
    );

    it(
      'should return data with default setting: limit = 10',
      async () => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';
        const limit1 = 12;
        const limit2 = 13;
        const offset = 1;

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

        const { data } = await axios.get(
          'http://localhost:4096/api/transfers?ownerId=' +
            senderId +
            '&limit=' +
            limit1 +
            '&limit=' +
            limit2 +
            '&offset=' +
            offset
        );
        expect(data.count).toBeLessThanOrEqual(10);
      },
      lib.oneMinute
    );
  });
});
