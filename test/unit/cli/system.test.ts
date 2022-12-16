import * as system from '@gny/cli/system';
import MockAdapter from 'axios-mock-adapter';
import { http as axios } from '@gny/cli/api';
import { jest } from '@jest/globals';

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

describe('system', () => {
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

  describe('getsysteminfo', () => {
    it('should get system info', async () => {
      const expected = {
        success: true,
        os: 'linux_4.9.184-linuxkit',
        version: '1.0.5',
        timestamp: 1581495274183,
        lastBlock: {
          height: '7591',
          timestamp: 1581495270000,
          behind: 0,
        },
      };

      mock.onGet(baseUrl + '/api/system/').reply(200, {
        data: expected,
      });

      await system.getSystemInfo();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });
});
