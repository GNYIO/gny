import * as gnyJS from '../../../packages/gny-js';
import * as lib from '../lib';
import axios from 'axios';

const oneMinute = 60 * 1000;
const tenMinutes = 10 * 60 * 1000;

describe('basic', () => {
  beforeAll(async done => {
    await lib.buildDockerImage();
    done();
  }, tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, oneMinute);

  describe('transfer', () => {
    it('should transfer to a recipient account', async done => {
      const genesisSecret =
        'grow pencil ten junk bomb right describe trade rich valid tuna service';
      const amount = 5 * 1e8;
      const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
      const message = '';
      const config = {
        headers: {
          magic: '594fe0f3',
        },
      };

      const trs = gnyJS.basic.transfer(
        recipient,
        amount,
        message,
        genesisSecret
      );
      const data = {
        transaction: trs,
      };

      const result = await axios.post(
        'http://localhost:4096/peer/transactions',
        data,
        config
      );
      expect(result.data).toHaveProperty('transactionId');
      done();
    });
  });
});
