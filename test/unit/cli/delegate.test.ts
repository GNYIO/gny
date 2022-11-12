import * as delegate from '../../../packages/cli/src/api/delegate';
import { http, pretty } from '../../../packages/cli/src/lib/api';
import MockAdapter from 'axios-mock-adapter';

describe('delegate', () => {
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

  describe('getdelegates', () => {
    it('should get delegates', async () => {
      const expected = {
        success: true,
        totalCount: 101,
        delegates: [
          {
            address: 'G3yguB3tazFf6bia3CU1RjXtv2iV6',
            tid:
              'ce6fced7d207e7e55f92a3b68a2394f34b2404cba5c35ea31bf80d2bc871efd5',
            username: 'gny_d72',
            publicKey:
              'feda901bb63e494e2f30865734e40aa0464f59f2a526a61648c86ba2faf1a952',
            votes: '0',
            producedBlocks: '74',
            missedBlocks: '2',
            fees: '0',
            rewards: '10524752475',
            _version_: 130,
            rate: 1,
            approval: '0',
            productivity: '99.99',
          },
          {
            address: 'Gu83duWXehxDPbJEY3QjWxnk7mh1',
            tid:
              'cdc902a95d8d731f922fd5d12955a3eaa3764e807459451a8e2662eff0fc769a',
            username: 'gny_d35',
            publicKey:
              'fcfa7c264972cb5ae40799706ee0f1724be7c4b8772334c12dcdff9c397323a9',
            votes: '0',
            producedBlocks: '71',
            missedBlocks: '3',
            fees: '0',
            rewards: '10124752475',
            _version_: 126,
            rate: 2,
            approval: '0',
            productivity: '99.99',
          },
        ],
      };

      const options = {
        limit: 2,
        offset: 1,
      };

      mock.onGet(baseUrl + '/api/delegates/', { params: options }).reply(200, {
        data: expected,
      });

      await delegate.getDelegates(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getdelegatescount', () => {
    it('should get delegates count', async () => {
      const expected = {
        success: true,
        count: 101,
      };

      mock.onGet(baseUrl + '/api/delegates/count').reply(200, {
        data: expected,
      });

      await delegate.getDelegatesCount();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getvoters', () => {
    it('should get voters by username', async () => {
      const expected = {
        success: true,
        delegates: [],
      };

      const username = 'xpgeng';

      mock
        .onGet(baseUrl + '/api/delegates/getVoters', {
          params: { username: username },
        })
        .reply(200, {
          data: expected,
        });

      await delegate.getVoters(username);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getdelegatebypublickey', () => {
    it('should get delegate by public key', async () => {
      const expected = {
        success: true,
        delegate: {
          address: 'GM5CevQY3brUyRtDMng5Co41nWHh',
          tid:
            '4c1ff5bfa17873df950b81f371cd0c9273d87af97af148b215d2f24545e383b2',
          username: 'xpgeng',
          publicKey:
            '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9',
          votes: '0',
          producedBlocks: '80',
          missedBlocks: '0',
          fees: '0',
          rewards: '11124752475',
          _version_: 137,
          rate: 97,
          approval: '0',
          productivity: '100.00',
        },
      };

      const publicKey =
        '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9';

      mock
        .onGet(baseUrl + '/api/delegates/get', {
          params: { publicKey: publicKey },
        })
        .reply(200, {
          data: expected,
        });

      await delegate.getDelegateByPublicKey(publicKey);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getdelegatebyusername', () => {
    it('should get delegate by username', async () => {
      const expected = {
        success: true,
        delegate: {
          address: 'GM5CevQY3brUyRtDMng5Co41nWHh',
          tid:
            '4c1ff5bfa17873df950b81f371cd0c9273d87af97af148b215d2f24545e383b2',
          username: 'xpgeng',
          publicKey:
            '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9',
          votes: '0',
          producedBlocks: '80',
          missedBlocks: '0',
          fees: '0',
          rewards: '11124752475',
          _version_: 137,
          rate: 97,
          approval: '0',
          productivity: '100.00',
        },
      };

      const username = 'xpgeng';

      mock
        .onGet(baseUrl + '/api/delegates/get', {
          params: { username: username },
        })
        .reply(200, {
          data: expected,
        });

      await delegate.getDelegateByUsername(username);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getdelegatebyaddress', () => {
    it('should get delegate by address', async () => {
      const expected = {
        success: true,
        delegate: {
          address: 'GM5CevQY3brUyRtDMng5Co41nWHh',
          tid:
            '4c1ff5bfa17873df950b81f371cd0c9273d87af97af148b215d2f24545e383b2',
          username: 'xpgeng',
          publicKey:
            '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9',
          votes: '0',
          producedBlocks: '80',
          missedBlocks: '0',
          fees: '0',
          rewards: '11124752475',
          _version_: 137,
          rate: 97,
          approval: '0',
          productivity: '100.00',
        },
      };

      const address = 'GM5CevQY3brUyRtDMng5Co41nWHh';

      mock
        .onGet(baseUrl + '/api/delegates/get', {
          params: { address: address },
        })
        .reply(200, {
          data: expected,
        });

      await delegate.getDelegateByAddress(address);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });
});
