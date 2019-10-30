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

async function prepareRegisterDelegateContract() {
  const setUserName = gnyClient.basic.setUserName('liangpeili', genesisSecret);
  const setUserNameTransData = {
    transaction: setUserName,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    setUserNameTransData,
    config
  );
  await lib.onNewBlock();
}

describe('contract-env - basic.registerDelegate', () => {
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
      'basic.registerDelegate correct fee is 100GNY',
      async done => {
        await prepareRegisterDelegateContract();

        // act
        const registerDelegate = gnyClient.basic.registerDelegate(
          genesisSecret
        );
        const transData = {
          transaction: registerDelegate,
        };
        expect(registerDelegate.fee).toEqual(String(100 * 1e8));

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
      'basic.registerDelegate too small fee returns error',
      async () => {
        await prepareRegisterDelegateContract();

        // act
        const SMALLER_FEE = String(0.01 * 1e8);
        const registerDelegate = gnyClient.transaction.createTransactionEx({
          type: 10,
          args: [],
          secret: genesisSecret,
          fee: SMALLER_FEE,
        });
        const transData = {
          transaction: registerDelegate,
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
      'basic.registerDelegate adding extra arguments to args array throws error',
      async () => {
        await prepareRegisterDelegateContract();

        // act
        const registerDelegate = gnyClient.transaction.createTransactionEx({
          type: 10,
          args: ['unnecessary argument'],
          secret: genesisSecret,
          fee: String(100 * 1e8),
        });
        const transData = {
          transaction: registerDelegate,
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
