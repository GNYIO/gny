import * as lib from '../lib';
import * as gnyJS from '../../../packages/gny-js';
import axios from 'axios';
import { generateAddress } from '../../../packages/utils/address';
import { randomBytes } from 'crypto';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

function randomAddress() {
  return generateAddress(randomBytes(32).toString('hex'));
}

async function beforeUiaTransfer() {
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

  // prepare registerAsset
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

  // prepare issue
  const issue = gnyJS.uia.issue('ABC.BBB', String(10 * 1e8), genesisSecret);
  const issueTransData = {
    transaction: issue,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    issueTransData,
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
      'uia.transfer correct fee is 0.1GNY',
      async done => {
        // prepare
        await beforeUiaTransfer();

        // act
        const transfer = gnyJS.uia.transfer(
          'ABC.BBB',
          String(10 * 1e8),
          randomAddress(),
          undefined,
          genesisSecret
        );
        const transData = {
          transaction: transfer,
        };
        expect(transfer.fee).toEqual(String(0.1 * 1e8));

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
      'uia.transfer too small fee returns error',
      async () => {
        // prepare
        await beforeUiaTransfer();

        // act
        const SMALLER_FEE = String(0.01 * 1e8);
        const issue = gnyJS.transaction.createTransactionEx({
          type: 103,
          args: ['ABC.BBB', String(10 * 1e8), randomAddress(), undefined],
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
      'uia.transfer adding extra arguments to args array throws error',
      async () => {
        // prepare
        await beforeUiaTransfer();

        const issue = gnyJS.transaction.createTransactionEx({
          type: 103,
          args: [
            'ABC.BBB',
            String(10 * 1e8),
            randomAddress(),
            undefined,
            'unnecessary argument',
          ],
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
      'uia.transfer calling contract with too few arguments throws error',
      async () => {
        // prepare
        await beforeUiaTransfer();

        const issue = gnyJS.transaction.createTransactionEx({
          type: 103,
          args: ['ABC.BBB', String(10 * 1e8)],
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
