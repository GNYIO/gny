import * as transaction from '../../../packages/cli/src/api/transaction';
import { http, ApiConfig } from '../../../packages/cli/src/lib/api';
import { stdout } from 'test-console';
import MockAdapter from 'axios-mock-adapter';

describe('transaction', () => {
  let mock: MockAdapter;
  const baseUrl = `http://127.0.0.1:4096`;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });
  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mock.reset();
  });

  describe('getunconfirmedtransactions', () => {
    it('should get unconfirmed transactions', async done => {
      const expected = {
        success: true,
        transactions: [],
      };

      const options = {
        key: '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b',
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
      };

      mock
        .onGet(baseUrl + '/api/transactions/unconfirmed', {
          params: options,
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await transaction.getUnconfirmedTransactions(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('gettransactions', () => {
    it('should get transactions', async done => {
      const expected = {
        success: true,
        transactions: [],
      };

      const options = {
        key: '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b',
      };

      mock
        .onGet(baseUrl + '/api/transactions/', {
          params: options,
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await transaction.getTransactions(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  // describe('gettransaction', () => {
  //   it('should get transaction by id ', async done => {
  //     const expected = {
  //       'success': true,
  //       'transactions': []
  //     };

  //     const id = '6bbfba40cd023e2ae65b8002ede18fdebab73c840a74854e744c95a15edb043c';

  //     mock
  //       .onGet(baseUrl + '/api/transactions/get', {
  //         params: { id: id },
  //       })
  //       .reply(200, {
  //         data: expected,
  //       });

  //     const inspect = stdout.inspect();
  //     await transaction.getUnconfirmedTransaction(id);
  //     inspect.restore();
  //     expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
  //     done();
  //   });
  // });

  describe('sendmoney', () => {
    it('should send money', async done => {
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

      mock.onPost(baseUrl + '/api/transactions/').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await transaction.sendMoney(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('transaction', () => {
    it('create a transaction in mainchain with user specified fee', async done => {
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
        args: [1000000, 'G3yguB3tazFf6bia3CU1RjXtv2iV6'],
      };

      mock.onPost(baseUrl + '/api/transactions/').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await transaction.sendTransactionWithFee(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });
});
