/**
 * @jest-environment jsdom
 */
import * as lib from '../../lib';
import * as gnyClient from '@gny/client';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('account', () => {
  const connection = new gnyClient.Connection();
  const basicApi = connection.contract.Basic;

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

  describe('Set account information', () => {
    describe('/setUserName', () => {
      it(
        'should set username',
        async () => {
          const username = 'a1300';
          const secret =
            'grow pencil ten junk bomb right describe trade rich valid tuna service';
          const response = await basicApi.setUserName(username, secret);
          expect(response).toHaveProperty('transactionId');
        },
        lib.oneMinute
      );
    });

    describe('/lockAccount', () => {
      it(
        'should lock account',
        async () => {
          const height = 173000;
          const amount = 30 * 1e8;
          const secret =
            'grow pencil ten junk bomb right describe trade rich valid tuna service';
          const username = 'a1300';

          // set username
          await basicApi.setUserName(username, secret);
          await lib.onNewBlock();

          const response = await basicApi.lockAccount(height, amount, secret);
          expect(response).toHaveProperty('transactionId');
        },
        lib.oneMinute
      );
    });
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
        await basicApi.setUserName(username, secret);
        await lib.onNewBlock();

        // lock account
        await basicApi.lockAccount(height, amount, secret);
        await lib.onNewBlock();

        const response = await basicApi.registerDelegate(secret);
        expect(response).toHaveProperty('transactionId');
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
        await basicApi.setUserName(username, secret);
        await lib.onNewBlock();

        // lock account
        await basicApi.lockAccount(height, amount, secret);
        await lib.onNewBlock();

        const response = await basicApi.registerDelegate(secret);
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });

  describe('/vote', () => {
    async function vote(keyList: string[], secret: string) {
      // lock the account
      await basicApi.lockAccount(173000, 30 * 1e8, genesisSecret);
      await lib.onNewBlock();

      // vote
      const response = await basicApi.vote(keyList, secret);
      expect(response).toHaveProperty('transactionId');
    }

    it(
      'should vote by key list',
      async () => {
        const keyList = ['gny_d1'];

        await vote(keyList, genesisSecret);
      },
      lib.oneMinute
    );

    it(
      'should be able to vote for two or more delegates',
      async () => {
        // vote for 2 delegates
        const keyList = ['gny_d100', 'gny_d101'];

        await vote(keyList, genesisSecret);
      },
      lib.oneMinute
    );
  });

  describe('/unvote', () => {
    async function voteThenUnvote(keyList: string[], secret) {
      // set username
      const username = 'xpgeng';
      await basicApi.setUserName(username, genesisSecret);
      await lib.onNewBlock();

      // lock the account
      await basicApi.lockAccount(173000, 30 * 1e8, genesisSecret);
      await lib.onNewBlock();

      // register delegate
      await basicApi.registerDelegate(genesisSecret);
      await lib.onNewBlock();

      // vote
      await basicApi.vote(keyList, secret);
      await lib.onNewBlock();

      // unvote
      const response = await basicApi.unvote(keyList, secret);
      expect(response).toHaveProperty('transactionId');
    }

    it(
      'should unvote by key list',
      async () => {
        const keyList = ['gny_d1'];
        await voteThenUnvote(keyList, genesisSecret);
      },
      lib.oneMinute
    );

    it(
      'should be able to unvote multiple delegates',
      async () => {
        const keyList = ['gny_d100', 'gny_d101'];
        await voteThenUnvote(keyList, genesisSecret);
      },
      lib.oneMinute
    );
  });
});
