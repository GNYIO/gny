import * as gnyClient from '../../../packages/client';
import * as lib from '../lib';
import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('index', () => {
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
      'test header logic',
      async () => {
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

        const config = {
          headers: {
            magic: '594fe0f3',
            'request-node-status': 'yes',
          },
        };

        const result = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(result.data).toHaveProperty('transactionId');
        expect(result.headers).toHaveProperty('node-status');
      },
      lib.oneMinute
    );
  });
});
