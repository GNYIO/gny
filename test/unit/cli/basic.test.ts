import * as basic from '../../../packages/cli/src/api/basic';
import { http, pretty } from '../../../packages/cli/src/lib/api';
import MockAdapter from 'axios-mock-adapter';

describe('basic', () => {
  let mock: MockAdapter;
  const baseUrl = `http://127.0.0.1:4096`;
  console.log = jest.fn();

  beforeEach(() => {
    mock = new MockAdapter(http);
  });
  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mock.reset();
  });

  describe('setsecondsecret', () => {
    it('should set second secret', async () => {
      const expected = {
        success: true,
        transactionId:
          '75d89ed9259833220d67c50ede0abe167542d66c772a803cba6d523984d10096',
      };
      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        secondSecret:
          'rebuild vast finger like cannon adjust fury blood space odor isolate sun',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await basic.setSecondSecret(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('lock', () => {
    it('should lock account transfer', async () => {
      const expected = {
        success: true,
        transactionId:
          '75d89ed9259833220d67c50ede0abe167542d66c772a803cba6d523984d10096',
      };
      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        height: 100,
        amount: 1000000,
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await basic.lock(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('vote', () => {
    it('should vote for delegates', async () => {
      const expected = {
        success: true,
        transactionId:
          '75d89ed9259833220d67c50ede0abe167542d66c772a803cba6d523984d10096',
      };
      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        usernames: 'liangpeili,xpgeng',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await basic.vote(options);

      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('unvote', () => {
    it('should cancel vote for delegates', async () => {
      const expected = {
        success: true,
        transactionId:
          '75d89ed9259833220d67c50ede0abe167542d66c772a803cba6d523984d10096',
      };
      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        usernames: 'liangpeili,xpgeng',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await basic.vote(options);

      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('registerdelegate', () => {
    it('should register a delegate', async () => {
      const expected = {
        success: true,
      };

      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        usename: 'xpgeng',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await basic.registerDelegate(options);

      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });
});
