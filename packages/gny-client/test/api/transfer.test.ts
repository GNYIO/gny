import { Connection } from '../../connection';
import * as lib from './lib';
import * as gnyClient from '../../index';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('transfer', () => {
  const connection = new Connection();
  const transferApi = connection.api('Transfer');

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

  describe('/getRoot', () => {
    it(
      'should get transfers',
      async () => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
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

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();
        const query = { ownerid: senderId };
        const response = await transferApi.getRoot(query);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getAmount', () => {
    it(
      'should get the amount according to an interval of timestamp',
      async () => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
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

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const trsData = await axios.get(
          'http://localhost:4096/api/transfers?ownerId=' + senderId
        );

        // get the amount
        const startTimestamp = trsData.data.transfers[0].timestamp;
        const endTimestamp = startTimestamp + 10000;
        const response = await transferApi.getAmount(
          startTimestamp,
          endTimestamp
        );
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
