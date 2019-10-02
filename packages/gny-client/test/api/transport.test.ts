/**
 * @jest-environment jsdom
 */
import { Connection } from '../../connection';
import * as lib from './lib';
import * as gnyClient from '../../index';
import axios from 'axios';
import BigNumber from 'bignumber.js';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('transport', () => {
  const connection = new Connection();
  const transportApi = connection.api('Transport');

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

  describe('/getNewBlock', () => {
    it(
      'should get new block',
      async done => {
        const { data } = await transportApi.getHeight();

        const blockData = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + data.height
        );

        const id = blockData.data.block.id;
        const response = await transportApi.getNewBlock(id);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getCommonBlock', () => {
    it(
      'should get common blocks',
      async done => {
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const { data } = await transportApi.getHeight();

        const height = data.height;

        const blockData = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + height
        );

        // get common block
        const query = {
          min: new BigNumber(height).minus(4).toFixed(),
          max: height,
          ids: [blockData.data.block.id as string],
        };

        const response = await transportApi.getCommonBlock(
          query.max,
          query.min,
          query.ids
        );
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getBlocks', () => {
    it(
      'should get blocks',
      async done => {
        // wait 2 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();

        const { data } = await transportApi.getHeight();
        const height = data.height;

        const blockData = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + height
        );

        // get common block
        const query = {
          limit: 2,
          lastBlockId: blockData.data.block.id,
        };

        const response = await transportApi.getBlocks(
          query.lastBlockId,
          query.limit
        );
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getTransactions', () => {
    it(
      'should execute one transaction',
      async () => {
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

        const response = await transportApi.getTransactions(trs);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getVotes', () => {
    it(
      'should get votes',
      async () => {
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

        const height = String(0);
        const id =
          'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585';
        const signatures = [
          {
            publicKey:
              '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b',
            signature:
              '62d8eda0130fff84f75b7937421dff50bd4553b4e30a2ca01e4a8138a0442a6c48f50e45994c8c14d473f8e283f3daf05cc04532d8760cd581ee8660208f280b',
          },
        ];

        const response = await transportApi.getVotes(height, id, signatures);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getHeight', () => {
    it(
      'should execute one transaction',
      async () => {
        const response = await transportApi.getHeight();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
