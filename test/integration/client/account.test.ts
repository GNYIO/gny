/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

async function registerIssuerAsync(
  name: string,
  desc: string,
  secret = genesisSecret
) {
  const issuerTrs = gnyClient.uia.registerIssuer(name, desc, secret);
  const issuerTransData = {
    transaction: issuerTrs,
  };

  await axios.post(
    'http://localhost:4096/peer/transactions',
    issuerTransData,
    config
  );
  await lib.onNewBlock();
}

async function registerAssetAsync(
  name: string,
  desc: string,
  amount: string,
  precision: number,
  secret = genesisSecret
) {
  const assetTrs = gnyClient.uia.registerAsset(
    name,
    desc,
    amount,
    precision,
    secret
  );
  const assetTransData = {
    transaction: assetTrs,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    assetTransData,
    config
  );
}

describe('account', () => {
  const connection = new gnyClient.Connection();
  const accountApi = connection.api.Account;

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

  describe('Get account information', () => {
    describe('/openAccount', () => {
      it(
        'should open an account with public key',
        async done => {
          const publicKey =
            '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b';
          const response = await accountApi.openAccount(publicKey);
          expect(response.success).toBeTruthy();
          done();
        },
        lib.oneMinute
      );
    });

    describe('/getBalance', () => {
      it(
        'should get balance by the address',
        async done => {
          const address = 'G2ofFMDz8GtWq9n65khKit83bWkQr';
          const response = await accountApi.getBalance(address);
          expect(response.success).toBeTruthy();
          done();
        },
        lib.oneMinute
      );
    });

    describe('/getAddressCurrencyBalance', () => {
      it(
        'should get the balance by the address and currency',
        async () => {
          const address = 'G2ofFMDz8GtWq9n65khKit83bWkQr';
          const currecny = 'AAA.ONE';

          await registerIssuerAsync('AAA', 'liang');

          await Promise.all([
            registerAssetAsync('ONE', 'first description', String(10 * 1e8), 8),
          ]);
          await lib.onNewBlock();

          const trs = gnyClient.uia.issue(
            'AAA.ONE',
            String(10 * 1e8),
            genesisSecret
          );
          const transData = {
            transaction: trs,
          };

          await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          await lib.onNewBlock();

          const response = await accountApi.getAddressCurrencyBalance(
            address,
            currecny
          );
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/getAccountByAddress', () => {
      it(
        'should get the account by address',
        async () => {
          const address = 'G2ofFMDz8GtWq9n65khKit83bWkQr';
          const response = await accountApi.getAccountByAddress(address);
          console.log(`response: ${JSON.stringify(response, null, 2)}`);
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/getAccountByUsername', () => {
      it(
        'should get the account by username',
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

          const response = await accountApi.getAccountByUsername(username);
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/getVotedDelegates', () => {
      it(
        'should get the voted delegates',
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
          const lockTrs = gnyClient.basic.lock(183000, 30 * 1e8, genesisSecret);
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

          const trs = gnyClient.basic.vote(['xpgeng'], genesisSecret);

          const transData = {
            transaction: trs,
          };

          await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          await lib.onNewBlock();

          const address = 'G2ofFMDz8GtWq9n65khKit83bWkQr';
          const response = await accountApi.getVotedDelegates({
            address,
          });
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/countAccounts', () => {
      it(
        'should get the number of accounts',
        async () => {
          const response = await accountApi.countAccounts();
          expect(response.success).toBeTruthy();
          expect(response.count).toEqual(103);
        },
        lib.oneMinute
      );
    });

    // describe('/getPublicKey', () => { // blocked by #35
    //   it(
    //     'should get the public key by address',
    //     async () => {
    //       const address = 'GM5CevQY3brUyRtDMng5Co41nWHh';
    //       const response = await accountApi.getPublicKey(address);
    //       console.log({response});
    //       expect(response.success).toBeTruthy();
    //     },
    //     lib.oneMinute
    //   );
    // });
  });
});
