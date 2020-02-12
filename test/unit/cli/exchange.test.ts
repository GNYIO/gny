import * as exchange from '../../../packages/cli/src/api/exchange';
import { http } from '../../../packages/cli/src/lib/api';
import { stdout } from 'test-console';
import MockAdapter from 'axios-mock-adapter';

describe('exchange', () => {
  let mock: MockAdapter;
  const baseUrl = `http://127.0.0.1:4096`;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });
  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mock.reset();
  });

  describe('genPublicKey', () => {
    it('should generate PublicKey', async done => {
      const expected =
        '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b';

      const secret =
        'grow pencil ten junk bomb right describe trade rich valid tuna service';

      const inspect = stdout.inspect();
      await exchange.genPublicKey(secret);
      inspect.restore();
      expect(inspect.output[1].indexOf(expected)).toBeGreaterThan(0);
      done();
    });
  });

  describe('openAccountWithSecret', () => {
    it('should open account with secret', async done => {
      const expected = {
        success: true,
        account: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          balance: '40000000000000000',
          secondPublicKey: null,
          lockHeight: '0',
          isDelegate: 0,
          username: null,
          publicKey:
            '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b',
        },
        latestBlock: {
          height: '6874',
          timestamp: 38916900,
        },
        version: {
          version: '1.0.5',
          build:
            'Sun Feb 09 2020 13:17:19 GMT+0000 (Coordinated Universal Time)',
          net: 'localnet',
        },
      };

      const secret =
        'grow pencil ten junk bomb right describe trade rich valid tuna service';

      mock.onPost(baseUrl + '/api/exchange/openAccount').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await exchange.openAccountWithSecret(secret);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });
});
