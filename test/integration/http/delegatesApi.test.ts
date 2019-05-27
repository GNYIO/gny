import * as gnyJS from '../../../packages/gny-js';
import * as lib from '../lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('blocksApi', () => {
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
      'should get the number of delegates',
      async () => {
        // register delegate
        const username = 'xpgeng';

        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        const trs = gnyJS.basic.registerDelegate(genesisSecret);
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/delegates/count'
        );
        console.log(data);
        // expect(data.block.height).toBe(2);
      },
      lib.oneMinute
    );
  });

  describe('/', () => {
    it(
      'should get all the delegates',
      async done => {
        const { data } = await axios.get('http://localhost:4096/api/delegates');
        expect(data.totalCount).toBe(101);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/get', () => {
    it(
      'should get the delegate by username',
      async done => {
        // register delegate
        const username = 'xpgeng';

        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        const trs = gnyJS.basic.registerDelegate(genesisSecret);
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/delegates/get?username=' + username
        );
        expect(data.delegate.username).toBe(username);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getVoters', () => {
    it(
      'should get the voters',
      async done => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyJS.basic.setUserName(username, genesisSecret);
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
        const lockTrs = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret);
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
        const delegateTrs = gnyJS.basic.registerDelegate(genesisSecret);
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
        const trsVote = gnyJS.basic.vote(['xpgeng'], genesisSecret);
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          transVoteData,
          config
        );
        await lib.onNewBlock();

        // get voters
        const { data } = await axios.get(
          'http://localhost:4096/api/delegates/getVoters?username=' + username
        );
        expect(data.accounts).toHaveLength(1);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/forging/enable', () => {
    it(
      'should get the voters',
      async done => {
        const username = 'gny_d1';
        const publicKey =
          '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9';
        const secret =
          'carpet pudding topple genuine relax rally problem before pill gun nation method';

        const transData = {
          secret,
          publicKey,
        };
        // const { data } = await axios.post(
        //   'http://localhost:4096/api/delegates/forging/enable',
        //   transData,
        //   config
        // );
        // console.log(data);

        try {
          const { data } = await axios.post(
            'http://localhost:4096/api/delegates/forging/enable',
            transData,
            config
          );
          console.log(data);
        } catch (error) {
          console.log(error);
        }
        // expect(data.accounts).toHaveLength(1);
        done();
      },
      lib.oneMinute
    );
  });
});
