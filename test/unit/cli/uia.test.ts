import * as uia from '../../../packages/cli/src/api/uia';
import { http, pretty } from '../../../packages/cli/src/lib/api';
import MockAdapter from 'axios-mock-adapter';

describe('uia', () => {
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

  describe('getissuers', () => {
    it('should get issuers', async () => {
      const expected = {
        success: true,
        count: 0,
        issues: [],
      };
      const options = {
        limit: 2,
        offset: 1,
      };

      mock.onGet(baseUrl + '/api/uia/issuers').reply(200, {
        data: expected,
      });

      await uia.getIssuers(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('isissuer', () => {
    it('should check if is an issuer by address', async () => {
      const expected = {
        success: true,
        isIssuer: true,
        issuerName: 'ABC',
      };
      const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

      mock.onGet(baseUrl + `/api/uia/isIssuer/${address}`).reply(200, {
        data: expected,
      });

      await uia.isIssuer(address);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getissuer', () => {
    it('should get issuer by username', async () => {
      const expected = {
        success: true,
      };
      const username = 'ABC';

      mock.onGet(baseUrl + '/api/uia/issuers/ABC').reply(200, {
        data: expected,
      });

      await uia.getIssuer(username);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getissuerassets', () => {
    it('should get issuer assets by username', async () => {
      const expected = {
        success: true,
      };
      const username = 'xpgeng';

      mock.onGet(baseUrl + `/api/uia/issuers/${username}/assets`).reply(200, {
        data: expected,
      });

      await uia.getIssuerAssets(username);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getassets', () => {
    it('should get assets', async () => {
      const expected = {
        success: true,
        count: 0,
        assets: [],
      };
      const options = {
        limit: 1,
        offset: 1,
      };

      mock.onGet(baseUrl + `/api/uia/assets`).reply(200, {
        data: expected,
      });

      await uia.getAssets(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getasset', () => {
    it('should get asset by name', async () => {
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

      await uia.getAsset(name);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getbalances', () => {
    it('should get balances by address', async () => {
      const expected = {
        success: true,
        count: 0,
        balances: [],
      };
      const options = {
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        limit: 1,
        offset: 1,
      };

      mock.onGet(baseUrl + `/api/uia/balances/${options.address}`).reply(200, {
        data: expected,
      });

      await uia.getBalances(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getbalancebycurrency', () => {
    it('should get balance by address and currency', async () => {
      const expected = {
        success: true,
        count: 0,
        balances: [],
      };
      const options = {
        address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        currency: 'ABC.BBB',
      };

      mock
        .onGet(
          baseUrl + `/api/uia/balances/${options.address}/${options.currency}`
        )
        .reply(200, {
          data: expected,
        });

      await uia.getBalance(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('sendasset', () => {
    it('should send asset to some address', async () => {
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

      await uia.sendAsset(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('registerissuer', () => {
    it('should register issuer', async () => {
      const expected = {
        success: true,
        transactionId:
          '6461d92a937b013fcd413ec9f83009f415121a06f0b5c7082ddc6a9691eddfee',
      };

      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        usename: 'ABC',
        desc: 'some desc',
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await uia.registerIssuer(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('registerasset', () => {
    it('should register asset', async () => {
      const expected = {
        success: true,
        transactionId:
          '242d24f62e2eacac5c48d2a6d748f2bdbdf7d9f8ea6abe1cba01d97c42ba14cc',
      };

      const options = {
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        name: 'BBB',
        desc: 'some desc',
        maximum: String(10 * 1e8),
        precision: 8,
      };

      mock.onPost(baseUrl + '/peer/transactions').reply(200, {
        data: expected,
      });

      await uia.registerAsset(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });
});
