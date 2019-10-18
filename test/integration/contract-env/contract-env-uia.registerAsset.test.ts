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

async function prepareRegisterAsset() {
  const registerIssuer = gnyClient.uia.registerIssuer(
    'ABC',
    'some desc',
    genesisSecret
  );
  const transData = {
    transaction: registerIssuer,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    transData,
    config
  );
  await lib.onNewBlock();
}

describe('contract-env - uia.registerAsset', () => {
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
      'uia.registerAsset correct fee is 500GNY',
      async done => {
        // prepare
        await prepareRegisterAsset();

        // act
        const registerAsset = gnyClient.uia.registerAsset(
          'BBB',
          'some desc',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const transData = {
          transaction: registerAsset,
        };
        expect(registerAsset.fee).toEqual(String(500 * 1e8));

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
      'uia.registerAsset too small fee returns error',
      async () => {
        // prepare
        await prepareRegisterAsset();

        // act
        const SMALLER_FEE = String(499 * 1e8);
        const registerAsset = gnyClient.transaction.createTransactionEx({
          type: 101,
          args: ['BBB', 'some desc', String(10 * 1e8), String(8)],
          secret: genesisSecret,
          fee: SMALLER_FEE,
        });
        const transData = {
          transaction: registerAsset,
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
      'uia.registerAsset adding extra arguments to args array throws error',
      async () => {
        // prepare
        await prepareRegisterAsset();

        const registerAsset = gnyClient.transaction.createTransactionEx({
          type: 101,
          args: [
            'ABC',
            'some desc',
            String(10 * 1e8),
            String(8),
            'unnecessary argument',
          ],
          secret: genesisSecret,
          fee: 500 * 1e8,
        });
        const transData = {
          transaction: registerAsset,
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
      'uia.registerAsset calling contract with too few arguments throws error',
      async () => {
        // prepare
        await prepareRegisterAsset();

        const registerAsset = gnyClient.transaction.createTransactionEx({
          type: 101,
          args: ['ABC', 'some desc', String(10 * 1e8)],
          secret: genesisSecret,
          fee: 500 * 1e8,
        });
        const transData = {
          transaction: registerAsset,
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
