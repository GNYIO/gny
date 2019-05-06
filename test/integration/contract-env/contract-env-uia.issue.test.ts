import * as lib from '../lib';
import * as gnyJS from '../../../packages/gny-js';
import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

async function beforeAssetIssue() {
  // prepare registerIssuer
  const registerIssuer = gnyJS.uia.registerIssuer(
    'ABC',
    'some desc',
    genesisSecret
  );
  const registerIssuerTransData = {
    transaction: registerIssuer,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    registerIssuerTransData,
    config
  );
  await lib.onNewBlock();

  // prepare issue
  const registerAsset = gnyJS.uia.registerAsset(
    'BBB',
    'some desc',
    String(10 * 1e8),
    8,
    genesisSecret
  );
  const registerAssetTransData = {
    transaction: registerAsset,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    registerAssetTransData,
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
      'uia.issue correct fee is 0.1GNY',
      async done => {
        // prepare
        await beforeAssetIssue();

        // act
        const issue = gnyJS.uia.issue(
          'ABC.BBB',
          String(10 * 1e8),
          genesisSecret
        );
        const transData = {
          transaction: issue,
        };
        expect(issue.fee).toEqual(0.1 * 1e8);

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
      'uia.issue too small fee returns error',
      async () => {
        // prepare
        await beforeAssetIssue();

        // act
        const SMALLER_FEE = 0.01 * 1e8;
        const issue = gnyJS.transaction.createTransactionEx({
          type: 102,
          args: ['ABC.BBB', String(10 * 1e8)],
          secret: genesisSecret,
          fee: SMALLER_FEE,
        });
        const transData = {
          transaction: issue,
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
      'uia.issue adding extra arguments to args array throws error',
      async () => {
        // prepare
        await beforeAssetIssue();

        const issue = gnyJS.transaction.createTransactionEx({
          type: 102,
          args: ['ABC.BBB', String(10 * 1e8), 'unnecessary argument'],
          secret: genesisSecret,
          fee: 0.1 * 1e8,
        });
        const transData = {
          transaction: issue,
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
      'uia.issue calling contract with too few arguments throws error',
      async () => {
        // prepare
        await beforeAssetIssue();

        const issue = gnyJS.transaction.createTransactionEx({
          type: 102,
          args: ['ABC'],
          secret: genesisSecret,
          fee: 0.1 * 1e8,
        });
        const transData = {
          transaction: issue,
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
