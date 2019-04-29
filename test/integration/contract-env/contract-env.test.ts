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
          received: 'wrongNetworkMagic',
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

    it(
      'blocks show correct transactions count',
      async done => {
        const firstHeight = await lib.onNewBlock();

        const { data } = await axios.get('http://localhost:4096/api/blocks');
        const firstBlock = data.blocks[firstHeight];
        expect(firstBlock.count).toEqual(0);

        const basicTransfer = gnyJS.basic.transfer(
          lib.createRandomAddress(),
          22 * 1e8,
          undefined,
          genesisSecret
        );
        const transData = {
          transaction: basicTransfer,
        };
        const contractCallResult = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        const secondHeight = await lib.onNewBlock(); // wait for new block
        const { data: newData } = await axios.get(
          'http://localhost:4096/api/blocks'
        );
        const secondBlock = newData.blocks[secondHeight];
        expect(secondBlock.count).toEqual(1);

        expect(secondHeight).toEqual(firstHeight + 1);

        done();
      },
      lib.oneMinute
    );

    it.skip('round', async done => {
      done();
    });

    it('sending UNSIGNED transaction with NOT complient BIP39 secret returns error', async () => {
      const WRONG_SECRET = 'wrong password';
      const trs = {
        type: 0,
        secret: WRONG_SECRET,
        args: [lib.createRandomAddress(), 22 * 1e8],
        message: undefined,
      };
      const contractPromise = axios.put(UNSIGNED_URL, trs, config);
      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        success: false,
        error: 'Invalid transaction body',
      });
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
    it('too big transaction gets rejected by server', async () => {
      const VERY_LONG_USERNAME = 'a'.repeat(8 * 1024 * 1024); // 8mb
      const setUserNameTrs = gnyJS.basic.setUserName(
        VERY_LONG_USERNAME,
        genesisSecret
      );
      const transData = {
        transaction: setUserNameTrs,
      };

      const contractPromise = axios.post(
        'http://localhost:4096/peer/transactions',
        transData,
        config
      );
      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        error: 'PayloadTooLargeError: request entity too large',
        success: false,
      });
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

    it('timestamp is bigger (UNSIGNED transaction) then Number Number.MAX_SAFE_INTEGER +1', async () => {
      const TOO_BIG_timestamp = Number.MAX_SAFE_INTEGER + 100;
      const trs = {
        secret: genesisSecret,
        type: 0,
        timestamp: TOO_BIG_timestamp,
        args: [lib.createRandomAddress(), 22 * 1e8],
      };
      const contractPromise = axios.put(UNSIGNED_URL, trs, config);

      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        success: false,
        error: 'Invalid transaction body',
      });
    });

    it('negative timestamp (UNSIGNED transaction) returns error', async () => {
      const NEGATIVE_timestamp = -10;
      const trs = {
        secret: genesisSecret,
        type: 0,
        timestamp: NEGATIVE_timestamp,
        args: [lib.createRandomAddress(), 22 * 1e8],
      };
      const contractPromise = axios.put(UNSIGNED_URL, trs, config);

      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        success: false,
        error: 'Invalid transaction body',
      });
    });

    it('zero timestamp (UNSIGNED transaction) returns error', async () => {
      const ZERO_timestamp = 0;
      const trs = {
        secret: genesisSecret,
        type: 0,
        timestamp: ZERO_timestamp,
        args: [lib.createRandomAddress(), 22 * 1e8],
      };
      const contractPromise = axios.put(UNSIGNED_URL, trs, config);

      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        success: false,
        error: 'Invalid transaction body',
      });
    });
  });

  describe('timestamp management', () => {
    it.skip('transaction (SIGNED) is valid until 3 slots later', async () => {});
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
