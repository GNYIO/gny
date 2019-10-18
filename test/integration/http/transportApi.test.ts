import * as gnyClient from '../../../packages/client';
import * as lib from '../lib';
import axios from 'axios';
import { CommonBlockParams, ManyVotes } from '../../../packages/interfaces';
import * as crypto from 'crypto';
import BigNumber from 'bignumber.js';

function randomHex(length: number) {
  return crypto.randomBytes(length).toString('hex');
}

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('transportApi', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, lib.oneMinute);

  describe('/newBlock', () => {
    it(
      'should get new block',
      async done => {
        const height = String(2);
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const blockData = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + height
        );

        // get block
        const query = {
          id: blockData.data.block.id,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/newBlock',
          query,
          config
        );
        expect(data).toHaveProperty('block');
        expect(data).toHaveProperty('votes');
        done();
      },
      lib.oneMinute
    );
  });

  describe('/commonBlock', () => {
    it(
      'commonBlock() - returns validation error when no ids are send with request',
      async () => {
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const NO_BLOCK_IDS = [];
        const query: CommonBlockParams = {
          min: String(0),
          max: String(2),
          ids: NO_BLOCK_IDS,
        };

        const resultPromise = axios.post(
          'http://localhost:4096/peer/commonBlock',
          query,
          config
        );

        return expect(resultPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: expect.stringMatching(/^validation failed/),
        });
      },
      lib.oneMinute
    );

    it(
      'commonBlock() - having min and max more then 10 blocks apart returns error',
      async () => {
        // wait 12 blocks
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        // this would search for 11 blocks in DB
        const query: CommonBlockParams = {
          min: String(1),
          max: String(11),
          ids: [randomHex(32)],
        };

        const resultPromise = axios.post(
          'http://localhost:4096/peer/commonBlock',
          query,
          config
        );

        return expect(resultPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'too big min,max',
        });
      },
      3 * lib.oneMinute
    );

    it(
      'commonBlock() - returns error if no commonBlock was found',
      async () => {
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        // get common block
        const query: CommonBlockParams = {
          min: String(0),
          max: String(3),
          ids: [randomHex(32)],
        };

        const resultPromise = axios.post(
          'http://localhost:4096/peer/commonBlock',
          query,
          config
        );

        return expect(resultPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Common block not found',
        });
      },
      lib.oneMinute
    );

    it(
      'commonBlock() - returns validation error when sending greater min then max',
      async () => {
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const query: CommonBlockParams = {
          min: String(4),
          max: String(3),
          ids: [randomHex(32)],
        };

        const resultPromise = axios.post(
          'http://localhost:4096/peer/commonBlock',
          query,
          config
        );

        return expect(resultPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Failed to find common block',
        });
      },
      lib.oneMinute
    );

    it(
      'commonBlock() - should get common block',
      async done => {
        // wait 5 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const height = await lib.getHeight();

        const blockData = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + height
        );

        // get common block
        const query: CommonBlockParams = {
          min: new BigNumber(height).minus(4).toFixed(),
          max: height,
          ids: [blockData.data.block.id as string],
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/commonBlock',
          query,
          config
        );

        expect(data.common).not.toBeUndefined();
        expect(data.common.height).toEqual(height);

        done();
      },
      2 * lib.oneMinute
    );
  });

  describe('/blocks', () => {
    it(
      'should get blocks',
      async done => {
        const height = 1;
        // wait 2 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();

        const blockData = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + height
        );

        // get common block
        const query = {
          limit: 2,
          lastBlockId: blockData.data.block.id,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/blocks',
          query,
          config
        );
        expect(data).toHaveProperty('blocks');
        expect(data.blocks).toHaveLength(2);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/transactions', () => {
    it(
      '/transactions() - should execute one transaction transactions',
      async done => {
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';

        // Transaction
        const trs = gnyClient.basic.transfer(
          recipient,
          String(amount),
          message,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        expect(data).toHaveProperty('transactionId');

        done();
      },
      lib.oneMinute
    );
  });

  describe('/votes', () => {
    it(
      'should get transactions',
      async done => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // lock the account
        const lockTrs = gnyClient.basic.lock(173000, 30 * 1e8, genesisSecret);
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          lockTransData,
          config
        );
        await lib.onNewBlock();

        // register delegate
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          delegateTransData,
          config
        );
        await lib.onNewBlock();

        // vote
        const trsVote = gnyClient.basic.vote(['xpgeng'], genesisSecret);
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          transVoteData,
          config
        );
        await lib.onNewBlock();

        const query: ManyVotes = {
          height: String(0),
          id:
            'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585',
          signatures: [
            {
              publicKey:
                '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b',
              signature:
                '62d8eda0130fff84f75b7937421dff50bd4553b4e30a2ca01e4a8138a0442a6c48f50e45994c8c14d473f8e283f3daf05cc04532d8760cd581ee8660208f280b',
            },
          ],
        };

        await axios.post('http://localhost:4096/peer/votes', query, config);

        done();
      },
      lib.oneMinute
    );
  });

  describe('/getUnconfirmedTransactions', () => {
    it(
      'should get unconfirmed transactions',
      async done => {
        const transData = {};

        const { data } = await axios.post(
          'http://localhost:4096/peer/getUnconfirmedTransactions',
          transData,
          config
        );
        expect(data.transactions).toHaveLength(0);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getHeight', () => {
    it(
      'should get the height',
      async done => {
        const transData = {};

        const { data } = await axios.post(
          'http://localhost:4096/peer/getHeight',
          transData,
          config
        );
        expect(data).toHaveProperty('height');
        done();
      },
      lib.oneMinute
    );
  });
});
