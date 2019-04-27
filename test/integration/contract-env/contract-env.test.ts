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

    const config = {
      headers: {
        magic: '594fe0f3',
      },
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
