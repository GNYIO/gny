/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gnyio/client';
import axios from 'axios';
import {
  ApiSuccess,
  DelegateOwnProducedBlocks,
  DelegatesWrapper,
  DelegatesWrapperSimple,
  IBlock,
  SimpleAccountsWrapper,
} from '@gnyio/interfaces';

const GNY_PORT = 6096;
const GNY_APP_NAME = 'app3';
const NETWORK_PREFIX = '172.22';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

function range(start, end): Array<Number> {
  const result = [];
  for (let i = start; i <= end; ++i) {
    result.push(i);
  }
  return result;
}

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

async function prepareDelegates(delegates: string[]) {
  // send 200,000 GNY to every delegate in the list
  for (let i = 0; i < delegates.length; ++i) {
    const del = delegates[i];
    const recipientAddress = gnyClient.crypto.getAddress(
      gnyClient.crypto.getKeys(del).publicKey
    );
    const nameTrs = gnyClient.basic.transfer(
      recipientAddress,
      String(200000 * 1e8),
      undefined,
      genesisSecret
    );
    const nameTransData = {
      transaction: nameTrs,
    };
    await axios.post(
      `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
      nameTransData,
      config
    );
  }
  await lib.onNewBlock(GNY_PORT);

  // delegates lock 190,000 GNY
  for (let i = 0; i < delegates.length; ++i) {
    const del = delegates[i];
    const nameTrs = gnyClient.basic.lock(
      String(1000000),
      String(190000 * 1e8),
      del
    );
    const nameTransData = {
      transaction: nameTrs,
    };

    await axios.post(
      `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
      nameTransData,
      config
    );
  }

  await lib.onNewBlock(GNY_PORT);
}

describe('delegate', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet',
    false
  );
  const delegateApi = connection.api.Delegate;

  beforeAll(async () => {
    await lib.stopOldInstances(DOCKER_COMPOSE_FILE, env);
    // do not build (this can run parallel)
    // await lib.buildDockerImage();
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnContainer(DOCKER_COMPOSE_FILE, env, GNY_PORT);
  }, lib.oneMinute * 3);

  afterEach(async () => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
  }, lib.oneMinute);

  describe('/count', () => {
    it(
      'should count the number of delegate',
      async () => {
        expect.assertions(1);

        const response = await delegateApi.count();

        expect(response).toEqual({
          success: true,
          count: 101,
        });
      },
      lib.oneMinute
    );
  });

  describe('/getVoters', () => {
    it(
      'should get voters by username',
      async () => {
        expect.assertions(1);

        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          nameTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // lock the account
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(190000 * 1e8),
          genesisSecret
        );
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          lockTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // register delegate
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          delegateTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // vote
        const trsVote = gnyClient.basic.vote(['xpgeng'], genesisSecret);
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transVoteData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await delegateApi.getVoters(username);

        expect(response).toEqual({
          accounts: [
            {
              _version_: lib.matchPositiveNumber,
              address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
              balance: lib.matchPositiveOrZeroIntString,
              delegate: {
                _version_: lib.matchPositiveNumber,
                address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
                approval: lib.matchProcentString,
                eligible: 1,
                fees: lib.matchPositiveOrZeroIntString,
                missedBlocks: lib.matchPositiveOrZeroIntString,
                producedBlocks: lib.matchPositiveOrZeroIntString,
                productivity: lib.matchPositiveOrZeroIntString,
                publicKey: lib.matchTid,
                rate: expect.any(Number),
                rewards: lib.matchPositiveOrZeroIntString,
                tid: lib.matchTid,
                username: 'xpgeng',
                votes: lib.matchPositiveOrZeroIntString,
              },
              gny: lib.matchPositiveOrZeroIntString,
              isDelegate: 1,
              isLocked: 1,
              lockAmount: lib.matchPositiveOrZeroIntString,
              lockHeight: lib.matchPositiveOrZeroIntString,
              publicKey: lib.matchPublicKey,
              secondPublicKey: null,
              username: 'xpgeng',
              weightRatio: lib.matchProcentString,
            },
          ],
          success: true,
        });
      },
      lib.oneMinute
    );
  });

  describe('/getOwnVotes', () => {
    it(
      'should get own votes by address',
      async () => {
        expect.assertions(5);

        // lock the account
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(190000 * 1e8),
          genesisSecret
        );
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          lockTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        await prepareDelegates([
          'change fire praise liar size soon double tissue image drama ribbon winter',
          'planet wet evil syrup item palm blur walnut dumb tennis deposit wash',
        ]);

        // vote
        const trsVote = gnyClient.basic.vote(
          ['gny_d1', 'gny_d2'],
          genesisSecret
        );
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transVoteData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const address = 'G2ofFMDz8GtWq9n65khKit83bWkQr'; // genesis address
        const response = (await delegateApi.getOwnVotes({
          address,
        })) as (ApiSuccess & SimpleAccountsWrapper);
        expect(response.success).toBeTruthy();

        expect(response).toEqual({
          delegates: [
            {
              _version_: lib.matchPositiveNumber,
              address: expect.stringMatching(
                /^(GkBnc7eU4x3YnGRz8RXxZT6neLyT)|(GAmhahhJ8km2Lter42Ln6e4qwfxS)$/
              ),
              approval: lib.matchProcentString,
              eligible: 1,
              fees: lib.matchPositiveOrZeroIntString,
              missedBlocks: lib.matchPositiveOrZeroIntString,
              producedBlocks: lib.matchPositiveOrZeroIntString,
              productivity: lib.matchPositiveOrZeroIntString,
              publicKey: lib.matchPublicKey,
              rate: expect.any(Number),
              rewards: lib.matchPositiveOrZeroIntString,
              tid: lib.matchTid,
              username: expect.stringMatching(/^(gny_d1)|gny_d2$/),
              votes: lib.matchPositiveOrZeroIntString,
            },
            {
              _version_: lib.matchPositiveNumber,
              address: expect.stringMatching(
                /^(GkBnc7eU4x3YnGRz8RXxZT6neLyT)|(GAmhahhJ8km2Lter42Ln6e4qwfxS)$/
              ),
              approval: lib.matchProcentString,
              eligible: 1,
              fees: lib.matchPositiveOrZeroIntString,
              missedBlocks: lib.matchPositiveOrZeroIntString,
              producedBlocks: lib.matchPositiveOrZeroIntString,
              productivity: lib.matchPositiveOrZeroIntString,
              publicKey: lib.matchPublicKey,
              rate: expect.any(Number),
              rewards: lib.matchPositiveOrZeroIntString,
              tid: lib.matchTid,
              username: expect.stringMatching(/^(gny_d1)|gny_d2$/),
              votes: lib.matchPositiveOrZeroIntString,
            },
          ],
          success: true,
        });

        expect(response.delegates).toHaveLength(2);
        const gny_d100 = response.delegates.filter(
          x => x.username === 'gny_d100'
        );
        const gny_d101 = response.delegates.filter(
          x => x.username === 'gny_d101'
        );
        expect(gny_d100).not.toBeUndefined();
        expect(gny_d101).not.toBeUndefined();
      },
      lib.oneMinute * 2
    );

    it(
      'should get own votes by username',
      async () => {
        expect.assertions(6);

        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          nameTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // lock the account
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(190000 * 1e8),
          genesisSecret
        );
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          lockTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        await prepareDelegates([
          'change fire praise liar size soon double tissue image drama ribbon winter',
          'planet wet evil syrup item palm blur walnut dumb tennis deposit wash',
          'seek sibling blood thank broken humble perfect liberty agree summer quick lady',
        ]);

        const trsVote = gnyClient.basic.vote(
          ['gny_d1', 'gny_d2', 'gny_d3'],
          genesisSecret
        );
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transVoteData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = (await delegateApi.getOwnVotes({
          username,
        })) as (ApiSuccess & SimpleAccountsWrapper);

        expect(response).toEqual({
          delegates: [
            {
              _version_: lib.matchPositiveNumber,
              address: expect.stringMatching(
                /^(GkBnc7eU4x3YnGRz8RXxZT6neLyT)|(G4GsxDgoEiMYvrNja8AR8bemdxRzi)|(GAmhahhJ8km2Lter42Ln6e4qwfxS)$/
              ),
              approval: lib.matchProcentString,
              eligible: 1,
              fees: lib.matchPositiveOrZeroIntString,
              missedBlocks: lib.matchPositiveOrZeroIntString,
              producedBlocks: lib.matchPositiveOrZeroIntString,
              productivity: lib.matchPositiveOrZeroIntString,
              publicKey: lib.matchPublicKey,
              rate: lib.matchPositiveNumber,
              rewards: lib.matchPositiveOrZeroIntString,
              tid: lib.matchTid,
              username: expect.stringMatching(/^(gny_d1)|(gny_d2)|(gny_d3)$/),
              votes: lib.matchPositiveOrZeroIntString,
            },
            {
              _version_: lib.matchPositiveNumber,
              address: expect.stringMatching(
                /^(GkBnc7eU4x3YnGRz8RXxZT6neLyT)|(G4GsxDgoEiMYvrNja8AR8bemdxRzi)|(GAmhahhJ8km2Lter42Ln6e4qwfxS)$/
              ),
              approval: lib.matchProcentString,
              eligible: 1,
              fees: lib.matchPositiveOrZeroIntString,
              missedBlocks: lib.matchPositiveOrZeroIntString,
              producedBlocks: lib.matchPositiveOrZeroIntString,
              productivity: lib.matchPositiveOrZeroIntString,
              publicKey: lib.matchPublicKey,
              rate: lib.matchPositiveNumber,
              rewards: lib.matchPositiveOrZeroIntString,
              tid: lib.matchTid,
              username: expect.stringMatching(/^(gny_d1)|(gny_d2)|(gny_d3)$/),
              votes: lib.matchPositiveOrZeroIntString,
            },
            {
              _version_: lib.matchPositiveNumber,
              address: expect.stringMatching(
                /^(GkBnc7eU4x3YnGRz8RXxZT6neLyT)|(G4GsxDgoEiMYvrNja8AR8bemdxRzi)|(GAmhahhJ8km2Lter42Ln6e4qwfxS)$/
              ),
              approval: lib.matchProcentString,
              eligible: 1,
              fees: lib.matchPositiveOrZeroIntString,
              missedBlocks: lib.matchPositiveOrZeroIntString,
              producedBlocks: lib.matchPositiveOrZeroIntString,
              productivity: lib.matchPositiveOrZeroIntString,
              publicKey: lib.matchPublicKey,
              rate: lib.matchPositiveNumber,
              rewards: lib.matchPositiveOrZeroIntString,
              tid: lib.matchTid,
              username: expect.stringMatching(/^(gny_d1)|(gny_d2)|(gny_d3)$/),
              votes: lib.matchPositiveOrZeroIntString,
            },
          ],
          success: true,
        });

        expect(response.success).toBeTruthy();

        expect(response.delegates).toHaveLength(3);

        const gny_d1 = response.delegates.filter(x => x.username === 'gny_d1');
        const gny_d2 = response.delegates.filter(x => x.username === 'gny_d2');
        const gny_d3 = response.delegates.filter(x => x.username === 'gny_d3');

        expect(gny_d1).not.toBeUndefined();
        expect(gny_d2).not.toBeUndefined();
        expect(gny_d3).not.toBeUndefined();
      },
      lib.oneMinute
    );
  });

  describe('/getDelegateByUsername', () => {
    it(
      'should get delegate by username',
      async () => {
        expect.assertions(1);

        // register delegate
        const username = 'xpgeng';

        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          nameTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const trs = gnyClient.basic.registerDelegate(genesisSecret);
        const transData = {
          transaction: trs,
        };

        await axios.post(
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await delegateApi.getDelegateByUsername(username);
        expect(response).toEqual({
          success: true,
          delegate: {
            _version_: lib.matchPositiveNumber,
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            approval: lib.matchProcentString,
            eligible: 0,
            fees: lib.matchPositiveOrZeroIntString,
            missedBlocks: lib.matchPositiveOrZeroIntString,
            producedBlocks: lib.matchPositiveOrZeroIntString,
            productivity: lib.matchPositiveOrZeroIntString,
            publicKey: lib.matchPublicKey,
            rate: lib.matchPositiveNumber,
            rewards: lib.matchPositiveOrZeroIntString,
            tid: lib.matchTid,
            username: 'xpgeng',
            votes: lib.matchPositiveOrZeroIntString,
          },
        });
      },
      lib.oneMinute
    );
  });

  describe('/getDelegates', () => {
    it(
      'should get delegates',
      async () => {
        expect.assertions(8);

        const offset = '1';
        const limit = '5';

        const response = await delegateApi.getDelegates(offset, limit);

        const oneDelegate = {
          _version_: 1,
          address: expect.any(String),
          approval: lib.matchProcentString,
          eligible: 0,
          fees: lib.matchPositiveOrZeroIntString,
          gny: lib.matchPositiveOrZeroIntString,
          isLocked: 0,
          lockAmount: lib.matchPositiveOrZeroIntString,
          lockHeight: lib.matchPositiveOrZeroIntString,
          missedBlocks: lib.matchPositiveOrZeroIntString,
          producedBlocks: lib.matchPositiveOrZeroIntString,
          productivity: lib.matchPositiveOrZeroIntString,
          publicKey: lib.matchPublicKey,
          rate: lib.matchPositiveNumber,
          rewards: lib.matchPositiveOrZeroIntString,
          tid: lib.matchTid,
          username: expect.any(String),
          votes: lib.matchPositiveOrZeroIntString,
        };

        // @ts-ignore
        expect(response.success).toEqual(true);
        // @ts-ignore
        expect(response.delegates).toHaveLength(5);
        // @ts-ignore
        expect(response.totalCount).toEqual(101);
        // @ts-ignore
        expect(response.delegates[0]).toEqual(oneDelegate);
        // @ts-ignore
        expect(response.delegates[1]).toEqual(oneDelegate);
        // @ts-ignore
        expect(response.delegates[2]).toEqual(oneDelegate);
        // @ts-ignore
        expect(response.delegates[3]).toEqual(oneDelegate);
        // @ts-ignore
        expect(response.delegates[4]).toEqual(oneDelegate);
      },
      lib.oneMinute
    );
  });

  describe('/forgingStatus', () => {
    it(
      'should get forging status',
      async () => {
        expect.assertions(1);

        const publicKey =
          '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b';
        const response = await delegateApi.forgingStatus(publicKey);

        expect(response).toEqual({
          success: true,
          enabled: false,
        });
      },
      lib.oneMinute
    );
  });

  describe('/ownProducedBlocks', () => {
    it(
      'get own Produced Blocks',
      async () => {
        expect.assertions(102);

        await lib.sleep(20 * 1000);

        const blocks: IBlock[] = [];
        for (let i = 1; i < 102; ++i) {
          const delegate = `gny_d${i}`;
          const response = (await delegateApi.ownProducedBlocks({
            username: delegate,
          })) as (ApiSuccess & DelegateOwnProducedBlocks);
          blocks.push(...response.blocks);

          expect(response).toEqual({
            success: expect.any(Boolean),
            delegate: expect.any(Object),
            blocks: expect.any(Array),
            count: expect.any(Number),
          });
        }

        expect(blocks.length).toBeGreaterThan(2);
      },
      lib.oneMinute * 2
    );
  });

  describe('/search', () => {
    it(
      'return found delegates that matches the search string, result is sorted by highest rank frist',
      async () => {
        expect.assertions(5);

        // this type (ApiSuccess & DelegatesWrapper) should be correct because
        // the validation will not throw an error
        const noDelegateWithThisName = (await delegateApi.search(
          'x'
        )) as (ApiSuccess & DelegatesWrapper);
        expect(noDelegateWithThisName.delegates).toHaveLength(0);
        expect(noDelegateWithThisName).toEqual({
          success: true,
          delegates: [],
          count: 0,
        });

        const manyResults = (await delegateApi.search('1')) as (ApiSuccess &
          DelegatesWrapper);
        expect(manyResults.delegates).toHaveLength(21);
        // delegates are named gny_d1 up to gny_d101
        const expectedDelegates = range(1, 101)
          .map(x => String(x))
          .filter(x => {
            return x.includes('1');
          });
        expect(expectedDelegates.length).toEqual(manyResults.delegates.length);

        function isSortedAscending(arr: number[]) {
          for (let i = 0; i < arr.length - 1; ++i) {
            if (arr[i + 1] < arr[i]) {
              return false;
            }
          }
          return true;
        }

        const delegateRanks = manyResults.delegates.map(x => x.rate);
        // the returned result should be sorted from
        // the highest ranked, to the lowest ranked
        expect(isSortedAscending(delegateRanks)).toEqual(true);
      },
      lib.oneMinute
    );

    it(
      'test offset and limit',
      async () => {
        expect.assertions(10);

        // cast result from search() to ApiSuccess to make for TypeScript
        // compiler clear that we get the results from the happy path
        const manyResults = (await delegateApi.search('1')) as (ApiSuccess &
          DelegatesWrapperSimple);
        expect(manyResults.count).toEqual(21);
        expect(manyResults.delegates).toHaveLength(21);

        const useOffset = (await delegateApi.search('1', 20)) as (ApiSuccess &
          DelegatesWrapperSimple);
        expect(useOffset.count).toEqual(21);
        expect(useOffset.delegates).toHaveLength(1);
        expect(manyResults.delegates[20]).toEqual(useOffset.delegates[0]);

        const atTheStart = (await delegateApi.search(
          '1',
          0,
          5
        )) as (ApiSuccess & DelegatesWrapperSimple);
        expect(atTheStart.count).toEqual(21);
        expect(atTheStart.delegates).toHaveLength(5);

        const inTheMiddle = (await delegateApi.search(
          '1',
          10,
          7
        )) as (ApiSuccess & DelegatesWrapperSimple);
        expect(inTheMiddle.count).toEqual(21);
        expect(inTheMiddle.delegates).toHaveLength(7);

        const otherCount = (await delegateApi.search('2')) as (ApiSuccess &
          DelegatesWrapperSimple);
        expect(otherCount.count).toEqual(19);
      },
      lib.oneMinute
    );
  });
});
