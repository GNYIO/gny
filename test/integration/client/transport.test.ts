/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';
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
  const connection = new gnyClient.Connection();
  const transportApi = connection.api.Transport;
  const blockApi = connection.api.Block;

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

  describe('/sendTransaction', () => {
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

        const response = await transportApi.sendTransaction(trs);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getNewBlock', () => {
    it(
      'should get new block by id',
      async () => {
        await lib.onNewBlock();

        const height = String(1);
        const { data } = await blockApi.getBlockByHeight(height);
        const id = data.block.id;

        const response = await transportApi.getNewBlock(id);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getBlocksByIds', () => {
    it(
      'should get blocks by id list',
      async () => {
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
        const min = new BigNumber(height).minus(4).toFixed();
        const max = height;
        const ids = [blockData.data.block.id as string];

        const response = await transportApi.getBlocksByIds(max, min, ids);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getBlocksByLimit', () => {
    it(
      'should get blocks by limit',
      async () => {
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const height = String(1);
        const { data } = await blockApi.getBlockByHeight(height);
        const id = data.block.id;

        const limit = '1';

        const response = await transportApi.getBlocksByLimit(limit, id);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/validateVote', () => {
    it(
      'should validate the votes',
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

        const query = {
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

        const response = await transportApi.validateVote(query);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getUnconfirmedTransactions', () => {
    it(
      'should get unconfirmed transactions',
      async () => {
        const response = await transportApi.getUnconfirmedTransactions();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getHeight', () => {
    it(
      'should get block height',
      async () => {
        const response = await transportApi.getHeight();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
