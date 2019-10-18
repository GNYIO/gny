import * as lib from '../lib';
import * as gnyClient from '../../../packages/client';
import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('contract-env - uia.registerIssuer', () => {
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
      'uia.registerIssuer correct fee is 100GNY',
      async done => {
        const registerIssuer = gnyClient.uia.registerIssuer(
          'ABC',
          'some desc',
          genesisSecret
        );
        const transData = {
          transaction: registerIssuer,
        };
        expect(registerIssuer.fee).toEqual(String(100 * 1e8));

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
      'uia.registerIssuer too small fee returns error',
      async () => {
        const SMALLER_FEE = String(99 * 1e8);
        const registerIssuer = gnyClient.transaction.createTransactionEx({
          type: 100,
          args: ['ABC', 'some desc'],
          secret: genesisSecret,
          fee: SMALLER_FEE,
        });
        const transData = {
          transaction: registerIssuer,
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
      'uia.registerIssuer adding extra arguments to args array throws error',
      async () => {
        const registerIssuer = gnyClient.transaction.createTransactionEx({
          type: 100,
          args: ['ABC', 'some desc', 'unnecessary argument'],
          secret: genesisSecret,
          fee: String(100 * 1e8),
        });
        const transData = {
          transaction: registerIssuer,
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
      'uia.registerIssuer calling contract with too few arguments throws error',
      async () => {
        const registerIssuer = gnyClient.transaction.createTransactionEx({
          type: 100,
          args: ['ABC'],
          secret: genesisSecret,
          fee: String(100 * 1e8),
        });
        const transData = {
          transaction: registerIssuer,
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
