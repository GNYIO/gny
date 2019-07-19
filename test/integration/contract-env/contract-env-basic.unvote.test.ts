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

async function prepareUnvote() {
  // prepare lock
  const lock = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
  const lockTransData = {
    transaction: lock,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    lockTransData,
    config
  );
  await lib.onNewBlock();

  // prepare vote
  const vote = gnyJS.basic.vote(['gny_d2'], genesisSecret);
  const voteTransData = {
    transaction: vote,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    voteTransData,
    config
  );
  await lib.onNewBlock();
}

describe('contract-env - basic.unvote', () => {
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
      'basic.unvote correct fee is 0.1GNY',
      async done => {
        await prepareUnvote();

        // act
        const unvote = gnyJS.basic.unvote(['gny_d2'], genesisSecret);
        const transData = {
          transaction: unvote,
        };
        expect(unvote.fee).toEqual(0.1 * 1e8);

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
      'basic.unvote too small fee returns error',
      async () => {
        await prepareUnvote();

        // act
        const SMALLER_FEE = 0.01 * 1e8;
        const unvote = gnyJS.transaction.createTransactionEx({
          type: 5,
          args: ['gny_d2'],
          secret: genesisSecret,
          fee: SMALLER_FEE,
        });
        const transData = {
          transaction: unvote,
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
      'basic.unvote adding extra arguments to args array throws error',
      async () => {
        await prepareUnvote();

        // act
        const unvote = gnyJS.transaction.createTransactionEx({
          type: 5,
          args: ['gny_d2', 'unnecessary argument'],
          secret: genesisSecret,
          fee: 0.1 * 1e8,
        });
        const transData = {
          transaction: unvote,
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
