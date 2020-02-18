import * as system from '../../../packages/cli/src/api/system';
import { http, pretty } from '../../../packages/cli/src/lib/api';
import MockAdapter from 'axios-mock-adapter';

describe('system', () => {
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

  describe('getsysteminfo', () => {
    it('should get system info', async done => {
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
      done();
    });
  });
});
