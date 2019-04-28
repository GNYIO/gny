import * as lib from '../lib';
import axios from 'axios';
import * as gnyJS from '../../../packages/gny-js';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const UNSIGNED_URL = 'http://localhost:4096/api/transactions';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('contract environment', () => {
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

  it(
    'check blocks',
    async done => {
      const height = await lib.getHeight();
      expect(typeof height).toEqual('number');

      done();
    },
    lib.oneMinute
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

    const result = await axios.put(UNSIGNED_URL, trs, config);

    expect(result.data).toHaveProperty('transactionId');
    done();
  });

  describe('contract environment', () => {
    it(
      'sending SIGNED transaction without http magic returns error',
      async () => {
        const recipient = lib.createRandomAddress();
        const basicTransfer = gnyJS.transaction.createTransactionEx({
          type: 0,
          fee: 0.1 * 1e8,
          args: ['1', recipient],
          secret: genesisSecret,
        });

        const transData = {
          transaction: basicTransfer,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData
          // config -> without http header "magic"
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Request is made on the wrong network',
          expected: '594fe0f3',
        });
      },
      lib.oneMinute
    );

    it(
      'sending SIGNED transaction with wrong http magic returns error',
      async () => {
        const recipient = lib.createRandomAddress();
        const basicTransfer = gnyJS.transaction.createTransactionEx({
          type: 0,
          fee: 0.1 * 1e8,
          args: ['1', recipient],
          secret: genesisSecret,
        });

        const transData = {
          transaction: basicTransfer,
        };

        const wrongHeaders = {
          headers: {
            magic: 'wrongNetworkMagic',
          },
        };

        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          wrongHeaders // changed headers
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Request is made on the wrong network',
          expected: '594fe0f3',
        });
      },
      lib.oneMinute
    );
    it.skip('sending UNSIGNED transaction without http magic returns error', async done => {
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

  describe('batch', () => {
    it.skip('batch SIGNED transactions', async done => {
      done();
    });
    it.skip('batch SIGNED transaction should stop if one error occurs', async done => {
      done();
    });
  });

  describe('too big', () => {
    it.skip('too big args in transactions result in error', async done => {
      done();
    });
  });

  describe('too long transaction fields', () => {
    it('message field (SIGNED transaction) is longer then 256 returns error', async () => {
      const recipient = lib.createRandomAddress();
      const amount = 22 * 1e8;
      const extraLongMessage = 'a'.repeat(257);
      const basicTransfer = gnyJS.basic.transfer(
        recipient,
        amount,
        extraLongMessage,
        genesisSecret
      );

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
        error: 'Invalid transaction body',
      });
    });

    it('message field (UNSIGNED transaction) longer then 256 returns error', async () => {
      const recipient = lib.createRandomAddress();
      const trs = {
        type: 0,
        fee: 0.1 * 1e8,
        args: ['1', recipient],
        secret: genesisSecret,
        message: 'b'.repeat(257),
      };

      const contractPromise = axios.put(UNSIGNED_URL, trs, config);

      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        success: false,
        error: 'Invalid transaction body',
      });
    });

    it.skip('timestamp is bigger (UNSIGNED transaction) then Number Number.MAX_SAFE_INTEGER +1', async () => {
      // return expect(contractPromise).rejects
      //   .toHaveProperty('response.data', {
      //     success: false,
      //     error: 'Invalid transaction body',
      //   });
    });
    it.skip('negative timestamp (UNSIGNED transaction) returns erro', async () => {});
  });

  describe('regression testing', () => {
    it(
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
      lib.oneMinute
    );
  });
});
