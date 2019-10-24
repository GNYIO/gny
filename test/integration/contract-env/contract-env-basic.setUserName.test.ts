import * as lib from '../lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('contract-env - basic.setUserName', () => {
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
      'basic.setUserName correct fee is 5GNY',
      async done => {
        const setUserName = gnyClient.basic.setUserName(
          'liangpeili',
          genesisSecret
        );
        const transData = {
          transaction: setUserName,
        };
        expect(setUserName.fee).toEqual(String(5 * 1e8));

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');

        done();
      },
      lib.oneMinute
    );

    it(
      'basic.setUserName too small fee returns error',
      async () => {
        const SMALLER_FEE = String(4 * 1e8);
        const setUserName = gnyClient.transaction.createTransactionEx({
          type: 1,
          args: [],
          secret: genesisSecret,
          fee: SMALLER_FEE,
        });
        const transData = {
          transaction: setUserName,
        };

        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Fee not enough',
        });
      },
      lib.oneMinute
    );
  });

  describe('args', () => {
    it(
      'basic.setUserName adding extra arguments to args array throws error',
      async () => {
        const setUserName = gnyClient.transaction.createTransactionEx({
          type: 1,
          args: ['liangpeili', 'unnecessary argument'],
          secret: genesisSecret,
          fee: String(5 * 1e8),
        });
        const transData = {
          transaction: setUserName,
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

    it(
      'basic.setUserName calling contract with too few arguments throws error',
      async () => {
        const setUserName = gnyClient.transaction.createTransactionEx({
          type: 1,
          args: [],
          secret: genesisSecret,
          fee: String(5 * 1e8),
        });
        const transData = {
          transaction: setUserName,
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
