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

describe('contract-env - basic.lock', () => {
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
    it('basic.lock correct fee is 0.1GNY', async done => {
      const basicLock = gnyClient.basic.lock(173000, 30 * 1e8, genesisSecret);
      const transData = {
        transaction: basicLock,
      };
      expect(basicLock.fee).toEqual(String(0.1 * 1e8));

      const { data } = await axios.post(
        'http://localhost:4096/peer/transactions',
        transData,
        config
      );
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('transactionId');

      done();
    });

    it('basic.lock too small fee returns error', async () => {
      const SMALLER_FEE = String(0.01 * 1e8);
      const basicLock = gnyClient.transaction.createTransactionEx({
        type: 3,
        args: [String(173000), String(30 * 1e8)],
        secret: genesisSecret,
        fee: SMALLER_FEE,
      });
      const transData = {
        transaction: basicLock,
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
  });

  describe('args', () => {
    it('basic.lock adding extra arguments to args array throws error', async () => {
      const basicLock = gnyClient.transaction.createTransactionEx({
        type: 3,
        args: [String(173000), String(30 * 1e8), 'unnecessary variable'],
        secret: genesisSecret,
        fee: String(0.1 * 1e8),
      });
      const transData = {
        transaction: basicLock,
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
    });

    it('basic.lock calling contract with too few arguments throws error', async () => {
      const basicLock = gnyClient.transaction.createTransactionEx({
        type: 3,
        args: [String(173000)],
        secret: genesisSecret,
        fee: String(0.1 * 1e8),
      });
      const transData = {
        transaction: basicLock,
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
    });
  });
});
