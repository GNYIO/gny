import * as exchange from '@gny/cli/exchange';
import MockAdapter from 'axios-mock-adapter';
import { http as axios } from '@gny/cli/api';
import { jest } from '@jest/globals';

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

describe('exchange', () => {
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

  describe('genPublicKey', () => {
    it('should generate PublicKey', async () => {
      const expected =
        '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b';

      const secret =
        'grow pencil ten junk bomb right describe trade rich valid tuna service';

      await exchange.genPublicKey(secret);
      expect(console.log).toHaveBeenCalledWith(expected);
    });
  });

  describe('openAccountWithSecret', () => {
    it('should open account with secret', async () => {
      const expected = {
        success: true,
        account: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          balance: '40000000000000000',
          secondPublicKey: null,
          lockHeight: '0',
          lockAmount: '0',
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

      await exchange.openAccountWithSecret(secret);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });
});
