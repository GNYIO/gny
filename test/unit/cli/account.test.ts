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
      const publicKey =
        'bd1e78c5a10fbf1eca36b28bbb8ea85f320967659cbf1f7ff1603d0a368867b9';

      mock
        .onPost(baseUrl + '/api/accounts/getPublicKey', {
          publicKey: publicKey,
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

  describe('getbalance', () => {
    it('should get balance by the address', async done => {
      const expected = {
        success: true,
        count: 1,
        balances: [
          {
            gny: '40000000000000000',
          },
        ],
      };
      const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

      mock
        .onGet(baseUrl + '/api/accounts/getbalance', {
          params: { address: address },
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await account.getBalance(address);
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
          balance: '40000000000000000',
          secondPublicKey: null,
          lockHeight: '0',
          isDelegate: 0,
          username: null,
          publicKey: null,
        },
        latestBlock: {
          height: '6905',
          timestamp: 38917210,
        },
        version: {
          version: '1.0.5',
          build:
            'Sun Feb 09 2020 13:17:19 GMT+0000 (Coordinated Universal Time)',
          net: 'localnet',
        },
      };
      const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

      mock
        .onGet(baseUrl + '/api/accounts/', {
          params: { address: address },
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await account.getAccountByAddress(address);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getaccountbyusername', () => {
    it('should get account by the username', async done => {
      const expected = {
        success: true,
        account: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          balance: '40000000000000000',
          secondPublicKey: null,
          lockHeight: '0',
          isDelegate: 0,
          username: 'xpgeng',
          publicKey: null,
        },
        latestBlock: {
          height: '6905',
          timestamp: 38917210,
        },
        version: {
          version: '1.0.5',
          build:
            'Sun Feb 09 2020 13:17:19 GMT+0000 (Coordinated Universal Time)',
          net: 'localnet',
        },
      };
      const username = 'xpgeng';

      mock
        .onGet(baseUrl + '/api/accounts/', {
          params: { username: username },
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await account.getAccountByUsername(username);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('countaccounts', () => {
    it('should get account by the username', async done => {
      const expected = {
        success: true,
        count: 103,
      };

      mock.onGet(baseUrl + '/api/accounts/count').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await account.countAccounts();
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getbalancebyaddresscurrency', () => {
    it('should get balance by address and currency', async done => {
      const expected = {
        success: true,
        account: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          balance: '40000000000000000',
          secondPublicKey: null,
          lockHeight: '0',
          isDelegate: 0,
          username: 'xpgeng',
          publicKey: null,
        },
        latestBlock: {
          height: '6905',
          timestamp: 38917210,
        },
        version: {
          version: '1.0.5',
          build:
            'Sun Feb 09 2020 13:17:19 GMT+0000 (Coordinated Universal Time)',
          net: 'localnet',
        },
      };
      const options = {
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        currency: 'gny',
      };

      mock
        .onGet(baseUrl + `/api/accounts/${options.address}/${options.currency}`)
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await account.getAddressCurrencyBalance(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getvoteddelegates', () => {
    it('should get voted delegates', async done => {
      const expected = {
        success: true,
        delegates: {},
      };
      const options = {
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        username: 'xpgeng',
      };

      mock.onGet(baseUrl + '/api/accounts/getVotes').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await account.getVotedDelegates(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getpublickey', () => {
    it('should get public key by the address', async done => {
      const expected = { success: false, error: 'Can not find public key' };
      const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

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
      expect(inspect.output[1].indexOf('false')).toBeGreaterThan(0);
      done();
    });
  });
});
