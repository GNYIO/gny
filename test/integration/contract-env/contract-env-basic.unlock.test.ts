import * as lib from '../lib';
import * as gnyClient from '../../../packages/gny-client';
import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('contract-env - basic.unlock', () => {
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

  describe('fee', () => {
    it(
      'basic.unlock correct fee is 0GNY',
      async () => {
        const unlock = gnyClient.basic.unlock(genesisSecret);
        const transData = {
          transaction: unlock,
        };
        expect(unlock.fee).toEqual(String(0 * 1e8));

        // we can't wait x heights for the account to unlock
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

  describe('args', () => {
    it(
      'basic.unlock adding extra arguments to args array throws error',
      async () => {
        const unlock = gnyClient.transaction.createTransactionEx({
          type: 6,
          args: ['unnecessary argument'],
          secret: genesisSecret,
          fee: 0 * 1e8,
        });
        const transData = {
          transaction: unlock,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid arguments length',
        });
      },
      lib.oneMinute
    );
  });
});
