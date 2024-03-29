import * as peer from '@gny/cli/peer';
import MockAdapter from 'axios-mock-adapter';
import { http as axios } from '@gny/cli/api';
import { jest } from '@jest/globals';

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

describe('peer', () => {
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

  describe('getpeers', () => {
    it('should get peers', async () => {
      const expected = {
        success: true,
        peers: [],
        count: 0,
      };

      mock.onGet(baseUrl + '/api/peers/').reply(200, {
        data: expected,
      });

      await peer.getPeers();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getversion', () => {
    it('should get version', async () => {
      const expected = {
        success: true,
        version: '1.0.5',
        build: 'Sun Feb 09 2020 13:17:19 GMT+0000 (Coordinated Universal Time)',
        net: 'localnet',
      };

      mock.onGet(baseUrl + '/api/peers/version').reply(200, {
        data: expected,
      });

      await peer.getVersion();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getinfo', () => {
    it('should get info', async () => {
      const expected = {
        success: true,
        id: 'QmPEge8KAzhrwKjFekvPgtNdawwusX997N9NYH9YzaUhix',
        multiaddrs: [
          '/ip4/1.1.0.1/tcp/4097/ipfs/QmPEge8KAzhrwKjFekvPgtNdawwusX997N9NYH9YzaUhix',
        ],
        publicIp: '1.1.0.1',
        address: '0.0.0.0',
      };

      mock.onGet(baseUrl + '/api/peers/info').reply(200, {
        data: expected,
      });

      await peer.getInfo();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });
});
