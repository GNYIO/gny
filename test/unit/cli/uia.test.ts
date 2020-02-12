import * as uia from '../../../packages/cli/src/api/uia';
import { http, ApiConfig } from '../../../packages/cli/src/lib/api';
import { stdout } from 'test-console';
import MockAdapter from 'axios-mock-adapter';

describe('uia', () => {
  let mock: MockAdapter;
  const baseUrl = `http://127.0.0.1:4096`;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });
  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mock.reset();
  });

  describe('getissuers', () => {
    it('should get issuers', async done => {
      const expected = {
        success: true,
        count: 0,
        issues: [],
      };
      const options = {
        limit: 2,
        offset: 1,
      };

      mock
        .onGet(baseUrl + '/api/uia/issuers', {
          params: options,
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await uia.getIssuers(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  // describe('isissuer', () => {
  //   it('should check if is an issuer by address', async done => {
  //     const expected = {
  //       'success': true,
  //       'count': 0,
  //       'issues': []
  //     };
  //     const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

  //     mock
  //       .onGet(baseUrl + '/api/uia/isIssuer', {
  //         params: {address: address},
  //       })
  //       .reply(200, {
  //         data: expected,
  //       });

  //     const inspect = stdout.inspect();
  //     await uia.isIssuer(address);
  //     inspect.restore();
  //     expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
  //     done();
  //   });
  // });

  describe('getissuer', () => {
    it('should get issuer by username', async done => {
      const expected = {
        success: true,
      };
      const username = 'xpgeng';

      mock
        .onGet(baseUrl + '/api/uia/issuers', {
          params: { username: username },
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await uia.getIssuer(username);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getissuerassets', () => {
    it('should get issuer assets by username', async done => {
      const expected = {
        success: true,
      };
      const username = 'xpgeng';

      mock
        .onGet(baseUrl + `/api/uia/issuers/${name}/assets`, {
          params: { username: username },
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await uia.getIssuerAssets(username);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getassets', () => {
    it('should get assets', async done => {
      const expected = {
        success: true,
        count: 0,
        assets: [],
      };
      const options = {
        limit: 1,
        offset: 1,
      };

      mock
        .onGet(baseUrl + `/api/uia/assets`, {
          params: options,
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await uia.getAssets(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getasset', () => {
    it('should get asset by name', async done => {
      const expected = {
        success: true,
        count: 0,
        assets: [],
      };
      const name = 'ABC';

      mock
        .onGet(baseUrl + `/api/uia/assets`, {
          params: { name: name },
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await uia.getAsset(name);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  // describe('getbalances', () => {
  //   it('should get balances by address', async done => {
  //     const expected = {
  //       'success': true,
  //       'count': 0,
  //       'assets': []
  //     };
  //     const options = {
  //       address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
  //       limit: 1,
  //       offset: 1,
  //     };

  //     mock
  //       .onGet(baseUrl + `/api/uia/balances`, {
  //         params: options,
  //       })
  //       .reply(200, {
  //         data: expected,
  //       });

  //     const inspect = stdout.inspect();
  //     await uia.getBalances(options);
  //     inspect.restore();
  //     expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
  //     done();
  //   });
  // });

  // describe('getbalancebycurrency', () => {
  //   it('should get balance by address and currency', async done => {
  //     const expected = {
  //       'success': true,
  //       'count': 0,
  //       'assets': []
  //     };
  //     const options = {
  //       address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
  //       currency: 'GNY',
  //     };

  //     mock
  //       .onGet(baseUrl + `/api/uia/balances`, {
  //         params: options,
  //       })
  //       .reply(200, {
  //         data: expected,
  //       });

  //     const inspect = stdout.inspect();
  //     await uia.getBalance(options);
  //     inspect.restore();
  //     expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
  //     done();
  //   });
  // });

  describe('sendasset', () => {
    it('should send asset to some address', async done => {
      const expected = {
        success: true,
        transactionId: '',
      };

      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        currency: 'GNY',
        amount: 1000000,
        recipient: 'G3yguB3tazFf6bia3CU1RjXtv2iV6',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await uia.sendAsset(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('registerdelegate', () => {
    it('should register a delegate', async done => {
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

      const inspect = stdout.inspect();
      await uia.registerDelegate(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });
});
