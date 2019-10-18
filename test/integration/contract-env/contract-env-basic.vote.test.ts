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

async function prepareVote() {
  // prepare lock
  const lock = gnyClient.basic.lock(173000, 30 * 1e8, genesisSecret);
  const lockTransData = {
    transaction: lock,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    lockTransData,
    config
  );
  await lib.onNewBlock();
}

describe('contract-env - basic.vote', () => {
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
      'basic.vote correct fee is 0.1GNY',
      async done => {
        await prepareVote();

        const vote = gnyClient.basic.vote(['gny_d2'], genesisSecret);
        const transData = {
          transaction: vote,
        };
        expect(vote.fee).toEqual(String(0.1 * 1e8));

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
      'basic.vote too small fee returns error',
      async () => {
        await prepareVote();

        const SMALLER_FEE = String(0.01 * 1e8);
        const vote = gnyClient.transaction.createTransactionEx({
          type: 4,
          args: ['gny_d2'],
          secret: genesisSecret,
          fee: SMALLER_FEE,
        });
        const transData = {
          transaction: vote,
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
      'basic.vote adding extra arguments to args array throws error',
      async () => {
        await prepareVote();

        const vote = gnyClient.transaction.createTransactionEx({
          type: 4,
          args: ['gny_d2', 'unnecessary argument'],
          secret: genesisSecret,
          fee: 0.1 * 1e8,
        });
        const transData = {
          transaction: vote,
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
