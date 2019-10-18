import * as lib from '../lib';
import * as gnyClient from '../../../packages/client';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('contract-env - basic.transfer', () => {
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

  it('basic.transfer correct fee is 0.1 GNY', async done => {
    const recipient = lib.createRandomAddress();
    const basicTransfer = gnyClient.transaction.createTransactionEx({
      type: 0,
      fee: 0.1 * 1e8,
      args: ['1', recipient],
      secret: genesisSecret,
    });

    const transData = {
      transaction: basicTransfer,
    };

    const { data } = await axios.post(
      'http://localhost:4096/peer/transactions',
      transData,
      config
    );

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('transactionId');

    done();
  });

  it('basic.transfer too small fee returns error', async () => {
    const recipient = lib.createRandomAddress();
    const basicTransfer = gnyClient.transaction.createTransactionEx({
      type: 0,
      fee: 0.01 * 1e8,
      args: ['1', recipient],
      secret: genesisSecret,
    });

    const transData = {
      transaction: basicTransfer,
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
  });

  it.skip('basic.transfer remaining fee greater than 0.1 GNY will be distributed', async done => {
    done();
  });

  it(
    'basic.transfer adding extra arguments to args array throws error',
    async () => {
      const recipient = lib.createRandomAddress();
      const basicTransfer = gnyClient.transaction.createTransactionEx({
        type: 0,
        fee: 0.1 * 1e8,
        args: ['1', recipient, 'someOtherArgument'],
        secret: genesisSecret,
      });

      const transData = {
        transaction: basicTransfer,
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
    'basic.transfer calling contract with too few arguments throws error',
    async () => {
      const basicTransfer = gnyClient.transaction.createTransactionEx({
        type: 0,
        fee: 0.1 * 1e8,
        args: ['1'],
        secret: genesisSecret,
      });

      const transData = {
        transaction: basicTransfer,
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
