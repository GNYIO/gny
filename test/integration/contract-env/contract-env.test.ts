import * as lib from '../lib';
import axios from 'axios';
import * as gnyJS from '../../../packages/gny-js';
import { randomBytes } from 'crypto';
import { generateAddress } from '../../../src/utils/address';
import { DOCUMENTATION_NOTE } from 'jest-validate/build/validateCLIOptions';

function createRandomAddress() {
  const rand = randomBytes(10).toString('hex');
  return generateAddress(rand);
}

const oneMinute = 60 * 1000;
const tenMinutes = 10 * 60 * 1000;

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('contract environment', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();
    done();
  }, tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, oneMinute);

  it(
    'check blocks',
    async done => {
      const height = await lib.getHeight();
      expect(typeof height).toEqual('number');

      done();
    },
    oneMinute
  );

  it('send unsigned transaction', async done => {
    const amount = 5 * 1e8;
    const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';

    const trs = {
      secret: genesisSecret,
      secondSecret: undefined,
      fee: 0.1 * 1e8,
      type: 0,
      args: [amount, recipient],
    };

    const UNSIGNED_URL = 'http://localhost:4096/api/transactions';

    const result = await axios.put(UNSIGNED_URL, trs, config);

    expect(result.data).toHaveProperty('transactionId');
    done();
  });

  describe('contract environment', () => {
    it.skip('sending SIGNED transaction without http magic returns error', async done => {
      done();
    });
    it.skip('sending SIGNED transaction with wrong http magic returns error', async done => {
      done();
    });
    it.skip('sending UNSIGNED transaction without http magic returns error', async done => {
      done();
    });
    it.skip('batch SIGNED transactions', async done => {
      done();
    });
    it.skip('batch SIGNED transaction should stop if one error occurs', async done => {
      done();
    });
    it.skip('sending SIGNED transaction without address prop succeeds', async done => {
      done();
    });
    it.skip('blocks show correct transactions count', async done => {
      done();
    });
    it.skip('round', async done => {
      done();
    });
    it.skip('sending UNSIGNED transaction with NOT complient BIP39 secret returns error', async done => {
      done();
    });
  });

  describe('too big', () => {
    it.skip('too big args in transactions result in error', async done => {
      done();
    });
  });

  describe('too long transaction fields', () => {
    it.skip('message field is longer then 256', async done => {
      done();
    });
  });

  describe('regression testing', () => {
    it.only(
      '/peer/getUnconfirmedTransactions does not return secret by UNSIGNED transactions',
      async done => {
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';

        const trs = {
          secret: genesisSecret,
          secondSecret: undefined,
          fee: 0.1 * 1e8,
          type: 0,
          args: [amount, recipient],
        };

        const UNSIGNED_URL = 'http://localhost:4096/api/transactions';
        const { data: transactionResult } = await axios.put(
          UNSIGNED_URL,
          trs,
          config
        );

        expect(transactionResult).toHaveProperty('transactionId');
        expect(transactionResult).toHaveProperty('success');

        const { data: transactions } = await axios.post(
          'http://localhost:4096/peer/getUnconfirmedTransactions',
          null,
          config
        );
        const unconfirmedTransactions = transactions.transactions;

        expect(unconfirmedTransactions).toBeInstanceOf(Array);
        expect(unconfirmedTransactions).toHaveLength(1);
        expect(unconfirmedTransactions[0]).not.toHaveProperty('secret'); // most important

        done();
      },
      oneMinute
    );
  });

  describe('basic.transfer', () => {
    it('basic.transfer correct fee is 0.1 GNY', async done => {
      const recipient = createRandomAddress();
      const basicTransfer = gnyJS.transaction.createTransactionEx({
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

      // wait for next block, check recipient

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('transactionId');

      done();
    });

    it.skip('basic.transfer too small fee returns error', async done => {
      done();
    });

    it.skip('basic.transfer remaining fee greater than 0.1GNY will be distributed', async done => {
      done();
    });
  });
});
