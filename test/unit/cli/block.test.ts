import * as block from '../../../packages/cli/src/api/block';
import { http } from '../../../packages/cli/src/lib/api';
import { stdout } from 'test-console';
import MockAdapter from 'axios-mock-adapter';

describe('block', () => {
  let mock: MockAdapter;
  const baseUrl = `http://127.0.0.1:4096`;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });
  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mock.reset();
  });

  describe('getheight', () => {
    it('should block height', async done => {
      const expected = {};

      mock.onGet(baseUrl + '/api/blocks/getHeight').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await block.getHeight();
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getstatus', () => {
    it('should get block status', async done => {
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

      const inspect = stdout.inspect();
      await block.getStatus();
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getmilestone', () => {
    it('should get block milestone', async done => {
      const expected = {
        success: true,
        milestone: 0,
      };

      mock.onGet(baseUrl + '/api/blocks/getMilestone').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await block.getMilestone();
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getreward', () => {
    it('should get block reward', async done => {
      const expected = {
        success: true,
        reward: 200000000,
      };

      mock.onGet(baseUrl + '/api/blocks/getReward').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await block.getReward();
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getsupply', () => {
    it('should get block supply', async done => {
      const expected = {
        success: true,
        supply: '40001001800000000',
      };

      mock.onGet(baseUrl + '/api/blocks/getSupply').reply(200, {
        data: expected,
      });

      const inspect = stdout.inspect();
      await block.getSupply();
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getaccountbyaddress', () => {
    it('should get account by the address', async done => {
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
          {
            id:
              '8671bf226caa5073a1b5930150e276382f5526f592c5c16456ad80d99f4c4676',
            version: 0,
            timestamp: 38070590,
            height: '1',
            prevBlockId:
              '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
            count: 0,
            fees: '0',
            reward: '0',
            payloadHash:
              'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            delegate:
              'ed7b40cff0fcfbbb72b9c144caf46b27eefcabdb0f928d3a8f9952b73c1c687f',
            signature:
              '6ed2e64f9d26834e4622f7dc2b8c3bc23e7856060a94937d671a986a73ae2616bbbf60d4f577ed67c96fd87a47cb3841a5466710ec348b333d5703b97ade870b',
          },
          {
            id:
              'c933a51c391850d24983390bfb52941a6b381f52673da5300e1a602cafde02d3',
            version: 0,
            timestamp: 38070600,
            height: '2',
            prevBlockId:
              '8671bf226caa5073a1b5930150e276382f5526f592c5c16456ad80d99f4c4676',
            count: 0,
            fees: '0',
            reward: '0',
            payloadHash:
              'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            delegate:
              '2893b584e9507f1db9812ea391bcf816af4fc1f4d98054572d047f996e24db2d',
            signature:
              'a208295a124d20ed2d58dcaa2dff2f292fcce784e724665576d3187706946cfda3f07c048e4fb71571cd392c36faf0b66683089fe7e7f2547be886daa417cc00',
          },
        ],
      };
      const options = {
        limit: 3,
        offset: 1,
      };

      mock
        .onGet(baseUrl + '/api/blocks/', {
          params: options,
        })
        .reply(200, {
          data: expected,
        });

      const inspect = stdout.inspect();
      await block.getBlocks(options);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getblockbyid', () => {
    it('should get block by id', async done => {
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

      const inspect = stdout.inspect();
      await block.getBlockById(id);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getblockbyheight', () => {
    it('should get block by id', async done => {
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

      const inspect = stdout.inspect();
      await block.getBlockByHeight(height);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });

  describe('getblockbyheight', () => {
    it('should get block by id', async done => {
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

      const inspect = stdout.inspect();
      await block.getBlockByHeight(height);
      inspect.restore();
      expect(inspect.output[1].indexOf('true')).toBeGreaterThan(0);
      done();
    });
  });
});
