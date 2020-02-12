import * as basic from '../../../packages/cli/src/api/basic';
import { http } from '../../../packages/cli/src/lib/api';
import { stdout } from 'test-console';
import MockAdapter from 'axios-mock-adapter';

describe('basic', () => {
  let mock: MockAdapter;
  const baseUrl = `http://127.0.0.1:4096`;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });
  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mock.reset();
  });

  describe('setsecondsecret', () => {
    it('should set second secret', async done => {
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

      const inspect = stdout.inspect();
      await basic.setSecondSecret(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('lock', () => {
    it('should lock account transfer', async done => {
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

      const inspect = stdout.inspect();
      await basic.lock(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('vote', () => {
    it('should vote for delegates', async done => {
      const expected = {
        success: true,
        transactionId:
          '75d89ed9259833220d67c50ede0abe167542d66c772a803cba6d523984d10096',
      };
      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        publicKeys:
          'GTg3YWJ7TKubzfqQmh7Sym5Zgeq2 G4Ta6QoDhDjgHiAALBPWQsDTRcukK',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await basic.vote(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('unvote', () => {
    it('should cancel vote for delegates', async done => {
      const expected = {
        success: true,
        transactionId:
          '75d89ed9259833220d67c50ede0abe167542d66c772a803cba6d523984d10096',
      };
      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        publicKeys:
          'GTg3YWJ7TKubzfqQmh7Sym5Zgeq2 G4Ta6QoDhDjgHiAALBPWQsDTRcukK',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await basic.vote(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });
});
