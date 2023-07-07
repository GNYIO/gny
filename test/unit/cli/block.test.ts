import * as block from '@gny/cli/block';
import MockAdapter from 'axios-mock-adapter';
import { http as axios } from '@gny/cli/api';
import { jest } from '@jest/globals';

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

describe('block', () => {
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

  describe('getheight', () => {
    it('should block height', async () => {
      const expected = {
        success: true,
        height: '8432',
      };

      mock.onGet(baseUrl + '/api/blocks/getHeight').reply(200, {
        data: expected,
      });

      await block.getHeight();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getstatus', () => {
    it('should get block status', async () => {
      const expected = {
        success: true,
        height: '7122',
        fee: '10000000',
        milestone: 0,
        reward: 200000000,
        supply: '40000992600000000',
      };

      mock.onGet(baseUrl + '/api/blocks/getStatus').reply(200, {
        data: expected,
      });

      await block.getStatus();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getmilestone', () => {
    it('should get block milestone', async () => {
      const expected = {
        success: true,
        milestone: 0,
      };

      mock.onGet(baseUrl + '/api/blocks/getMilestone').reply(200, {
        data: expected,
      });

      await block.getMilestone();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getreward', () => {
    it('should get block reward', async () => {
      const expected = {
        success: true,
        reward: 200000000,
      };

      mock.onGet(baseUrl + '/api/blocks/getReward').reply(200, {
        data: expected,
      });

      await block.getReward();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getsupply', () => {
    it('should get block supply', async () => {
      const expected = {
        success: true,
        supply: '40001001800000000',
      };

      mock.onGet(baseUrl + '/api/blocks/getSupply').reply(200, {
        data: expected,
      });

      await block.getSupply();
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getblocks', () => {
    it('should get blocks', async () => {
      const expected = {
        success: true,
        count: '7188',
        blocks: [
          {
            id:
              '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
            version: 0,
            timestamp: 0,
            height: '0',
            prevBlockId: null,
            count: 203,
            fees: '0',
            reward: '0',
            payloadHash:
              '4b1598f8e52794520ea65837b44f58b39517cda40548ef6094e5b24c11af3493',
            delegate:
              'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
            signature:
              'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c',
          },
        ],
      };
      const options = {
        limit: 3,
        offset: 1,
      };

      mock.onGet(baseUrl + '/api/blocks').reply(200, {
        data: expected,
      });

      await block.getBlocks(options);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getblockbyid', () => {
    it('should get block by id', async () => {
      const expected = {
        success: true,
        block: {
          id:
            '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
          version: 0,
          timestamp: 0,
          height: '0',
          prevBlockId: null,
          count: 203,
          fees: '0',
          reward: '0',
          payloadHash:
            '4b1598f8e52794520ea65837b44f58b39517cda40548ef6094e5b24c11af3493',
          delegate:
            'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
          signature:
            'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c',
        },
      };
      const id =
        '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541';

      mock
        .onGet(baseUrl + '/api/blocks/getBlock', {
          params: { id: id },
        })
        .reply(200, {
          data: expected,
        });

      await block.getBlockById(id);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });

  describe('getblockbyheight', () => {
    it('should get block by height', async () => {
      const expected = {
        success: true,
        block: {
          id:
            'f7389a3ce3ad40c7bc024b2c3239aa19aae2f0d3fd298fa3e3c7cf457033846b',
          version: 0,
          timestamp: 38072590,
          height: '201',
          prevBlockId:
            'f890d96cbc80591655d9317873d7582b1ad480719aef3739bda0376343fbe601',
          count: 0,
          fees: '0',
          reward: '0',
          payloadHash:
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          delegate:
            'a9672d7bffea1d4880ab0f24594365c7204fdf5232ad210a5b87a983184abc62',
          signature:
            '4784475bbc1ed428f3ebdeb4ceafaece70deaf3c46457bb7757a3e0f006f297b9f0d30f2c876c24fbcf712dd2ecd064766134f24bf526f1571711dc4961e0007',
        },
      };
      const height = '201';

      mock
        .onGet(baseUrl + '/api/blocks/getBlock', {
          params: { height: height },
        })
        .reply(200, {
          data: expected,
        });

      await block.getBlockByHeight(height);
      expect(console.log).toHaveBeenCalledWith(pretty({ data: expected }));
    });
  });
});
