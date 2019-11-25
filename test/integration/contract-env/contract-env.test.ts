import * as lib from '../lib';
import axios from 'axios';
import * as gnyClient from '@gny/client';
import BigNumber from 'bignumber.js';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const UNSIGNED_URL = 'http://localhost:4096/api/transactions';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

async function getAllDelegateData() {
  const response = await axios.get(
    'http://localhost:4096/api/delegates?limit=101'
  );
  const delegates = response.data.delegates;
  const filtered = delegates.map(del => {
    return {
      username: del.username,
      publicKey: del.publicKey,
      address: del.address,
    };
  });

  for (let i = 0; i < filtered.length; ++i) {
    const one = filtered[i];
    const x = await axios.get(
      `http://localhost:4096/api/accounts/getBalance?address=${one.address}`
    );
    one.gny = Number(x.data.balances[0].gny);
  }

  return filtered;
}

describe('contract environment', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    await lib.printActiveContainers();
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
      expect(typeof height).toEqual('string');

      done();
    },
    lib.oneMinute
  );

  it(
    'send unsigned transaction',
    async done => {
      const amount = 5 * 1e8;
      const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';

      const trs = {
        secret: genesisSecret,
        secondSecret: undefined,
        fee: String(0.1 * 1e8),
        type: 0,
        args: [amount, recipient],
      };

      const result = await axios.put(UNSIGNED_URL, trs, config);

      expect(result.data).toHaveProperty('transactionId');
      done();
    },
    lib.oneMinute
  );

  describe('contract environment', () => {
    it(
      'sending SIGNED transaction without http magic returns error',
      async () => {
        const recipient = lib.createRandomAddress();
        const basicTransfer = gnyClient.transaction.createTransactionEx({
          type: 0,
          fee: String(0.1 * 1e8),
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
        const basicTransfer = gnyClient.transaction.createTransactionEx({
          type: 0,
          fee: String(0.1 * 1e8),
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

    // should the header also be set?
    it.skip(
      'sending UNSIGNED transaction without http magic returns error',
      async () => {
        const trs = {
          type: 0,
          secret: genesisSecret,
          args: [lib.createRandomAddress(), 22 * 1e8],
        };

        const contractPromise = axios.put(UNSIGNED_URL, trs);
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Request is made on the wrong network',
          expected: '594fe0f3',
        });
      },
      lib.oneMinute
    );

    it(
      'blocks show correct transactions count',
      async done => {
        const firstHeight = await lib.onNewBlock();

        const { data } = await axios.get('http://localhost:4096/api/blocks');
        const firstBlock = data.blocks[firstHeight];
        expect(firstBlock.count).toEqual(0);

        const basicTransfer = gnyClient.basic.transfer(
          lib.createRandomAddress(),
          String(22 * 1e8),
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

        const expectedHeight = new BigNumber(firstHeight).plus(1).toFixed();
        expect(secondHeight).toEqual(expectedHeight);

        done();
      },
      lib.oneMinute
    );

    it.skip(
      'round',
      async done => {
        done();
      },
      lib.oneMinute
    );

    it(
      'sending UNSIGNED transaction with NOT complient BIP39 secret returns error',
      async () => {
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
      },
      lib.oneMinute
    );

    it.skip(
      'rejected transaction does not get into block',
      async () => {},
      lib.oneMinute
    );
    it.skip(
      'sending rejected transaction twice (within same block) returns erro',
      async () => {},
      lib.oneMinute
    );
    it.skip(
      'sending rejected transaction (after one block) returns error',
      async () => {},
      lib.oneMinute
    );
    it.skip(
      'sending SIGNED transaction with a random height property gets correctly saved to DB (we should differentiate between UNCONFIRMED and CONFIRMED transactions, one with height, one without)',
      async () => {},
      lib.oneMinute
    );
    it.skip(
      'sending transaction from the "future" should return error',
      async () => {},
      lib.oneMinute
    );

    it(
      'signing a transaction with a second password should return error (if second password was not registered)',
      async () => {
        const UNREGISTERED_SECOND_PASSWORD = 'pass';

        const basicTransfer = gnyClient.basic.transfer(
          lib.createRandomAddress(),
          String(10 * 1e8),
          undefined,
          genesisSecret,
          UNREGISTERED_SECOND_PASSWORD
        );
        expect(basicTransfer).toHaveProperty('secondSignature');
        // expect(basicTransfer).toHaveProperty('secondPublicKey');

        const transData = {
          transaction: basicTransfer,
        };
        const contractCallPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        return expect(contractCallPromise).rejects.toHaveProperty(
          'response.data',
          {
            success: false,
            error: 'Error: Second password was not registered',
          }
        );
      },
      lib.oneMinute
    );

    it(
      'resending exact same transaction also for next block should return error',
      async () => {
        const firstHeight = await lib.onNewBlock();

        const basicTransfer = gnyClient.basic.transfer(
          lib.createRandomAddress(),
          String(22 * 1e8),
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

        const secondHeight = await lib.onNewBlock(); // wait for next block
        const expectedHeight = new BigNumber(firstHeight).plus(1).toFixed();
        expect(secondHeight).toEqual(expectedHeight);

        // resend exact same transaction
        const contractCallResultPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        return expect(contractCallResultPromise).rejects.toHaveProperty(
          'response.data',
          {
            success: false,
            error: 'Error: Transaction already confirmed',
          }
        );
      },
      lib.oneMinute
    );

    it(
      'negative fee with SIGNED transaction',
      async () => {
        const SMALLER_FEE = String(-1 * 1e8);
        const unlock = gnyClient.transaction.createTransactionEx({
          type: 6,
          args: [],
          secret: genesisSecret,
          fee: SMALLER_FEE,
        });
        const transData = {
          transaction: unlock,
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
      },
      lib.oneMinute
    );

    it.skip(
      'negative fee with UNSIGNED transaction',
      async () => {},
      lib.oneMinute
    );

    it(
      'message field (UNSIGNED transaction) allows empty string',
      async done => {
        const recipient = lib.createRandomAddress();
        const EMPTY_STRING = '';
        const trs = {
          type: 0,
          fee: String(0.1 * 1e8),
          args: ['1', recipient],
          secret: genesisSecret,
          message: EMPTY_STRING,
        };

        const result = await axios.put(UNSIGNED_URL, trs, config);

        expect(result.data).toHaveProperty('transactionId');
        done();
      },
      lib.oneMinute
    );

    it(
      'message field (UNSIGNED transaction) rejects if it consists non-alphynumerical letter',
      async () => {
        const recipient = lib.createRandomAddress();
        const NON_ALPHYNUMERICAL_MESSAGE = 'drop table block;--';
        const trs = {
          type: 0,
          fee: String(0.1 * 1e8),
          args: ['1', recipient],
          secret: genesisSecret,
          message: NON_ALPHYNUMERICAL_MESSAGE,
        };

        const resultPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(resultPromise).rejects.toHaveProperty('response.data', {
          error: 'Invalid transaction body',
          success: false,
        });
      },
      lib.oneMinute
    );

    it(
      'message field (SIGNED transaction) rejects if it consists non-alphynumerical letter',
      async () => {
        const recipient = lib.createRandomAddress();
        const amount = 1 * 1e8;
        const NON_ALPHYNUMERICAL_MESSAGE = 'drop table block;--';

        const trs = gnyClient.basic.transfer(
          recipient,
          String(amount),
          NON_ALPHYNUMERICAL_MESSAGE,
          genesisSecret
        );

        const transData = {
          transaction: trs,
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
      },
      lib.oneMinute
    );
  });

  describe('batch', () => {
    it.skip(
      'batch SIGNED transactions',
      async done => {
        done();
      },
      lib.oneMinute
    );
    it.skip(
      'batch SIGNED transaction should stop if one error occurs (should execute all transactions until falsy transaction)',
      async done => {
        done();
      },
      lib.oneMinute
    );
    it.skip(
      'batch - send in one batch a SIGNED transaction twice (should execute all transactions until second transaction)',
      async done => {
        done();
      },
      lib.oneMinute
    );
  });

  describe('distributed fees (long running)', () => {
    it(
      'fees should get equally distributed to all delegates',
      async done => {
        // get data of deleges before
        const delegatesBefore = await getAllDelegateData();

        // every delegate should have 0 gny
        expect(delegatesBefore).toHaveLength(101);
        delegatesBefore.forEach(ele => {
          expect(ele).toHaveProperty('gny', 0);
        });

        // create 101 simple transactions
        // for every transaction there should be 0.1 GNY fee that should get distributed
        for (let i = 0; i < 101; ++i) {
          const trs = gnyClient.basic.transfer(
            lib.createRandomAddress(),
            String(1 * 1e8), // this is not imporant
            undefined,
            genesisSecret
          );
          const transData = {
            transaction: trs,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
        }

        // wait for one block
        await lib.onNewBlock();

        // double check delegates for 0 GNY
        const delegatesStillShouldNotHaveAnyMoney = await getAllDelegateData();
        expect(delegatesStillShouldNotHaveAnyMoney).toHaveLength(101);
        delegatesStillShouldNotHaveAnyMoney.forEach(ele => {
          expect(ele).toHaveProperty('gny', 0);
        });

        // wait until block 101 (end of round 1)
        await lib.waitUntilBlock(String(101));

        // now every delegate should have 0.1 GNY
        const result = await getAllDelegateData();
        expect(result).toHaveLength(101);
        result.forEach(ele => {
          expect(ele).toHaveProperty('gny', 0.1 * 1e8);
        });

        done();
      },
      20 * 60 * 1000
    );
  });

  describe('too big', () => {
    it(
      'too big transaction gets rejected by server',
      async () => {
        const VERY_LONG_USERNAME = 'a'.repeat(8 * 1024 * 1024); // 8mb
        const setUserNameTrs = gnyClient.basic.setUserName(
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
      },
      lib.oneMinute
    );
  });

  describe('too long transaction fields', () => {
    it(
      'message field (SIGNED transaction) is longer then 256 returns error',
      async () => {
        const recipient = lib.createRandomAddress();
        const amount = 22 * 1e8;
        const extraLongMessage = 'a'.repeat(257);
        const basicTransfer = gnyClient.basic.transfer(
          recipient,
          String(amount),
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
      },
      lib.oneMinute
    );

    it(
      'message field (UNSIGNED transaction) longer then 256 returns error',
      async () => {
        const recipient = lib.createRandomAddress();
        const trs = {
          type: 0,
          fee: String(0.1 * 1e8),
          args: ['1', recipient],
          secret: genesisSecret,
          message: 'b'.repeat(257),
        };

        const contractPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );

    it(
      'timestamp is bigger (UNSIGNED transaction) then Number Number.MAX_SAFE_INTEGER +1',
      async () => {
        const TOO_BIG_timestamp = Number.MAX_SAFE_INTEGER + 100;
        const trs = {
          fee: 0.1 * 1e8,
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
      },
      lib.oneMinute
    );

    it(
      'negative timestamp (UNSIGNED transaction) returns error',
      async () => {
        const NEGATIVE_timestamp = -10;
        const trs = {
          fee: String(0.1 * 1e8),
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
      },
      lib.oneMinute
    );

    it(
      'zero timestamp (UNSIGNED transaction) returns error',
      async () => {
        const ZERO_timestamp = 0;
        const trs = {
          fee: String(0.1 * 1e8),
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
      },
      lib.oneMinute
    );
  });

  describe('timestamp management', () => {
    it(
      'transaction (SIGNED) is valid 1 block after creation',
      async done => {
        const firstHeight = await lib.onNewBlock();

        const basicTransfer = gnyClient.basic.transfer(
          lib.createRandomAddress(),
          String(22 * 1e8),
          undefined,
          genesisSecret
        );

        // now wait for 1 block
        const secondHeight = await lib.onNewBlock();

        // send
        const transData = {
          transaction: basicTransfer,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');

        const expected = new BigNumber(firstHeight).plus(1).toFixed();
        expect(secondHeight).toEqual(expected);

        done();
      },
      lib.oneMinute
    );

    it(
      'transaction (SIGNED) is valid 2 blocks after creation',
      async done => {
        const firstHeight = await lib.onNewBlock();

        const basicTransfer = gnyClient.basic.transfer(
          lib.createRandomAddress(),
          String(22 * 1e8),
          undefined,
          genesisSecret
        );

        // now wait for 2 blocks
        await lib.onNewBlock();
        const thirdHeight = await lib.onNewBlock();

        // send
        const transData = {
          transaction: basicTransfer,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');

        const expected = new BigNumber(firstHeight).plus(2).toFixed();
        expect(thirdHeight).toEqual(expected);

        done();
      },
      lib.oneMinute
    );

    it(
      'transaction (SIGNED) is valid 3 blocks after creation',
      async done => {
        const firstHeight = await lib.onNewBlock();

        const basicTransfer = gnyClient.basic.transfer(
          lib.createRandomAddress(),
          String(22 * 1e8),
          undefined,
          genesisSecret
        );

        // now wait for 3 blocks
        await lib.onNewBlock();
        await lib.onNewBlock();
        const fourthHeight = await lib.onNewBlock();

        // send
        const transData = {
          transaction: basicTransfer,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');

        const expected = new BigNumber(firstHeight).plus(3).toFixed();
        expect(fourthHeight).toEqual(expected);

        done();
      },
      lib.oneMinute
    );

    it(
      'transaction (SIGNED) is valid 4 blocks after creation',
      async done => {
        const firstHeight = await lib.onNewBlock();

        const basicTransfer = gnyClient.basic.transfer(
          lib.createRandomAddress(),
          String(22 * 1e8),
          undefined,
          genesisSecret
        );

        // now wait for 4 blocks
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();
        const fourthHeight = await lib.onNewBlock();

        // send
        const transData = {
          transaction: basicTransfer,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');

        const expected = new BigNumber(firstHeight).plus(4).toFixed();
        expect(fourthHeight).toEqual(expected);

        done();
      },
      lib.oneMinute
    );
  });

  describe('regression testing', () => {
    it.skip(
      '/peer/getUnconfirmedTransactions does not return secret by UNSIGNED transactions',
      async done => {
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';

        const trs = {
          secret: genesisSecret,
          secondSecret: undefined,
          fee: String(0.1 * 1e8),
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

        await lib.sleep(1000);

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
