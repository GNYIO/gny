import * as lib from './lib';
import * as gnyJS from '../../packages/gny-js';
import axios from 'axios';

const DOCKER_COMPOSE_P2P = 'config/e2e/docker-compose.p2p.yml';

is;
it;
possible;
to;
have;
send;
effectivly;
0;
GNY;
to;
an;
account;
to;
'activate it?';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

async function getGNYBalance(port: number, account: string) {
  const { data } = await axios.get(
    `http://localhost:${port}/api/accounts?address=${account}`
  );
  return data.account.gny as string;
}

async function assertBalanceOnNodes(
  expectedBalance: string,
  account: string,
  ports: number[]
) {
  for (const p of ports) {
    const balance = await getGNYBalance(p, account);
    // TODO add custom error message
    expect(balance).toEqual(expectedBalance);
  }
}

async function attack(port: number, transaction: any) {
  const trsData = {
    transaction: transaction,
  };
  const attackPromise = await axios.post(
    `http://localhost:${port}/peer/transactions`,
    trsData,
    config
  );
  return attackPromise;
}

describe('double spend attack', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'attack',
    async done => {
      // setup account_0 (1000 GNY)
      // setup account_1 (0 GNY)
      // create attack_trs_0 (account_0 -> account_1 (1000 GNY))
      // create attack_trs_1 (account_0 -> account_1 (1000 GNY))

      // (simultaneously)
      // send trs0 to node_0
      // send trs1 to node_1

      // wait for 2 blocks
      // only one of (trs_0 or trs_1) should be available from /api/transactions (on both nodes)
      // account_0 should have 0 GNY (on both nodes)
      // account_1 should have 1000 GNY (on both nodes)

      const account_0 = lib.createRandomAccount();
      const account_1 = lib.createRandomAccount();

      await lib.onNewBlock(4096);
      await lib.onNewBlock(4098);

      // transfer 1000.1 GNY from genesis to account_0
      const fuelTransaction_0 = gnyJS.basic.transfer(
        account_0.address,
        String(1000.1 * 1e8),
        undefined,
        lib.GENESIS.secret
      );
      const fuelTransaction_0_Data = {
        transaction: fuelTransaction_0,
      };
      // @ts-ignore
      const { data } = await axios.post(
        'http://localhost:4096/peer/transactions',
        fuelTransaction_0_Data,
        config
      );
      await lib.onNewBlock(4096);

      // check balance of account_0 on both nodes
      await assertBalanceOnNodes(String(1000.1 * 1e8), account_0.address, [
        4096,
        4098,
      ]);

      // create first transaction for attack
      const attackTrs_0 = gnyJS.basic.transfer(
        account_1.address,
        String(1000 * 1e8),
        null,
        account_0.secret
      );

      // wait for 1000ms to be sure that the transactionId is different
      await lib.sleep(1000);

      // create second transaction for attack
      const attackTrs_1 = gnyJS.basic.transfer(
        account_1.address,
        String(1000 * 1e8),
        null,
        account_0.secret
      );

      // both attack transaction shouldn't be the same
      expect(attackTrs_0.timestamp).not.toEqual(attackTrs_1.timestamp);

      // send attack_0 to node_0
      // send attack_1 to node_1
      try {
        await Promise.all([
          attack(4096, attackTrs_0),
          attack(4098, attackTrs_1),
        ]);
      } catch (err) {}

      // wait for 2 blocks for the dust to settle
      await lib.onNewBlock(4096);
      await lib.onNewBlock(4098);

      // TODO
      // check if one of the transactions is in the block

      // check accounts
      await assertBalanceOnNodes(String(0 * 1e8), account_0.address, [
        4096,
        4098,
      ]);
      await assertBalanceOnNodes(String(1000 * 1e8), account_1.address, [
        4096,
        4098,
      ]);

      done();
    },
    2 * lib.oneMinute
  ); // make two minutes
});
