import * as transaction from '@gny/cli/transaction';
import MockAdapter from 'axios-mock-adapter';
import { http as axios } from '@gny/cli/api';
import { jest } from '@jest/globals';

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

describe('transaction', () => {
  let mock;
  const baseUrl = `http://127.0.0.1:4096`;
  console.log = jest.fn();

  beforeEach(() => {
    // @ts-ignore
    mock = new MockAdapter(axios);
  });
  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mock.reset();
  });

  describe('getunconfirmedtransactions', () => {
    it('should get unconfirmed transactions', async () => {
      const expected = {
        success: true,
        transactions: [],
      };

      const options = {
        key: '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b',
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
      };

      mock.onGet(baseUrl + '/api/transactions/unconfirmed').reply(200, {
        data: expected,
      });

      await transaction.getUnconfirmedTransactions(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('gettransactions', () => {
    it('should get transactions', async () => {
      const expected = {
        success: true,
        transactions: [],
      };

      const options = {
        key: '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b',
      };

      mock.onGet(baseUrl + '/api/transactions/').reply(200, {
        data: expected,
      });

      await transaction.getTransactions(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('gettransaction', () => {
    it('should get transaction by id ', async () => {
      const expected = {
        success: true,
        transaction: {},
      };

      const id =
        '6bbfba40cd023e2ae65b8002ede18fdebab73c840a74854e744c95a15edb043c';

      mock
        .onGet(baseUrl + '/api/transactions/unconfirmed/get', {
          params: { id: id },
        })
        .reply(200, {
          data: expected,
        });

      await transaction.getUnconfirmedTransaction(id);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('sendmoney', () => {
    it('should send money', async () => {
      const expected = {
        success: true,
        transactionId: [],
      };

      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        amount: 1000000,
        recipient: 'G3yguB3tazFf6bia3CU1RjXtv2iV6',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await transaction.sendMoney(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('transaction', () => {
    it('create a transaction in mainchain with user specified fee', async () => {
      const expected = {
        success: true,
        transactionId:
          '75d89ed9259833220d67c50ede0abe167542d66c772a803cba6d523984d10096',
      };

      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        fee: 1000000,
        type: 1,
        args: JSON.stringify([1000000, 'G3yguB3tazFf6bia3CU1RjXtv2iV6']),
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await transaction.sendTransactionWithFee(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });
});
