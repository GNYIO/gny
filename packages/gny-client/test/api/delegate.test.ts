import { Connection } from '../../connection';
import * as lib from './lib';
import * as gnyClient from '../../index';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('delegate', () => {
  const connection = new Connection();
  const delegateApi = connection.api('Delegate');

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

  describe('/count', () => {
    it(
      'should count the number of delegate',
      async done => {
        const response = await delegateApi.count();
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getVoters', () => {
    it(
      'should get voters by usernane',
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

        const response = await delegateApi.getVoters(username);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getDelegateByUnsername', () => {
    it(
      'should get delegate by username',
      async done => {
        // register delegate
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

        const trs = gnyClient.basic.registerDelegate(genesisSecret);
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const response = await delegateApi.getDelegateByUnsername(username);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getDelegates', () => {
    it(
      'should get delegates',
      async () => {
        const offset = '1';
        const limit = '5';

        const response = await delegateApi.getDelegates(offset, limit);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/forgingStatus', () => {
    it(
      'should get forging status',
      async () => {
        const publicKey =
          '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b';
        const response = await delegateApi.forgingStatus(publicKey);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/registerDelegate', () => {
    it(
      'should get forging status',
      async () => {
        const secret =
          'grow pencil ten junk bomb right describe trade rich valid tuna service';

        const username = 'a1300';
        const height = 183000;
        const amount = 30 * 1e8;

        // set username
        const accountApi = connection.api('Account');
        await accountApi.setUserName(username, secret);
        await lib.onNewBlock();

        // lock account
        await accountApi.lockAccount(height, amount, secret);
        await lib.onNewBlock();

        const response = await delegateApi.registerDelegate(secret);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
