import * as account from '../../../packages/cli/src/api/account';
import { http, ApiConfig } from '../../../packages/cli/src/lib/api';
import { stdout } from 'test-console';
import MockAdapter from 'axios-mock-adapter';

describe('account', () => {
  let mock: MockAdapter;
  const baseUrl = `http://127.0.0.1:4096`;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });
  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mock.reset();
  });

  describe('openaccount', () => {
    it('should open account', async done => {
      const expected = {
        success: true,
        account: {
          address: 'G4b8BhmeRFBmWAHZemKD25BmEP2G',
          balance: 0,
          secondPublicKey: '',
          lockHeight: 0,
          publicKey:
            'bd1e78c5a10fbf1eca36b28bbb8ea85f320967659cbf1f7ff1603d0a368867b9',
        },
      };
      const publicKey =
        'bd1e78c5a10fbf1eca36b28bbb8ea85f320967659cbf1f7ff1603d0a368867b9';

      mock
        .onGet(baseUrl + '/api/accounts/getPublicKey', {
          params: { publicKey: publicKey },
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await account.openAccount(publicKey);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getaccountbyaddress', () => {
    it('should get account by the address', async done => {
      const expected = {
        success: true,
        account: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          balance: 0,
          secondPublicKey: '',
          lockHeight: 0,
          publicKey:
            'bd1e78c5a10fbf1eca36b28bbb8ea85f320967659cbf1f7ff1603d0a368867b9',
        },
      };
      const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

      // const mock = new MockAdapter(http);

      mock
        .onGet(baseUrl + '/api/accounts/getPublicKey', {
          params: { address: address },
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await account.getPublicKey(address);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });
});
