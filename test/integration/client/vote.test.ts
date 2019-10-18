/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from '../lib';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('vote', () => {
  const connection = new Connection();
  const voteApi = connection.api.Vote;
  const accountApi = connection.api.Account;
  const delegateApi = connection.api.Delegate;

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

  describe('/vote', () => {
    it(
      'should vote by key list',
      async () => {
        const keyList = ['xpgeng'];
        const secret = genesisSecret;

        // set username
        const username = 'xpgeng';
        await accountApi.setUserName(username, genesisSecret);
        await lib.onNewBlock();

        // lock the account
        await accountApi.lockAccount(173000, 30 * 1e8, genesisSecret);
        await lib.onNewBlock();

        // register delegate
        await delegateApi.registerDelegate(genesisSecret);
        await lib.onNewBlock();

        // vote
        const response = await voteApi.vote(keyList, secret);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/unvote', () => {
    it(
      'should unvote by key list',
      async () => {
        const keyList = ['xpgeng'];
        const secret = genesisSecret;

        // set username
        const username = 'xpgeng';
        await accountApi.setUserName(username, genesisSecret);
        await lib.onNewBlock();

        // lock the account
        await accountApi.lockAccount(173000, 30 * 1e8, genesisSecret);
        await lib.onNewBlock();

        // register delegate
        await delegateApi.registerDelegate(genesisSecret);
        await lib.onNewBlock();

        // vote
        await voteApi.vote(keyList, secret);
        await lib.onNewBlock();

        // unvote
        const response = await voteApi.unvote(keyList, secret);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
