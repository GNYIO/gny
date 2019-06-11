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

async function registerIssuerAsync(name, desc, secret = genesisSecret) {
  const issuerTrs = gnyJS.uia.registerIssuer(name, desc, secret);
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
  name,
  desc,
  amount,
  precision,
  secret = genesisSecret
) {
  const assetTrs = gnyJS.uia.registerAsset(
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
  await lib.onNewBlock();
}

describe('accountsApi', () => {
  beforeAll(async done => {
    lib.exitIfNotRoot();

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

  describe('/generateAccount', () => {
    it(
      'should get the address and keys of the secet',
      async () => {
        const account = await axios.get(
          'http://localhost:4096/api/accounts/generateAccount'
        );
        expect(account.data).toHaveProperty('address');
      },
      lib.oneMinute
    );
  });

  describe('/open', () => {
    it(
      'should open an account',
      async () => {
        const query = {
          secret: genesisSecret,
        };

        const { data } = await axios.post(
          'http://localhost:4096/api/accounts/open',
          query,
          config
        );
        expect(data).toHaveProperty('account');
      },
      lib.oneMinute
    );
  });

  describe('/', () => {
    it(
      'should get an account',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

        const { data } = await axios.get(
          'http://localhost:4096/api/accounts?address=' + address
        );
        expect(data.account.address).toBe(address);
      },
      lib.oneMinute
    );
  });

  describe('/getBalance', () => {
    it(
      'should get the balance',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

        const { data } = await axios.get(
          'http://localhost:4096/api/accounts/getBalance?address=' + address
        );
        expect(data.balances[0].gny).toBe(String(40000000000000000));
      },
      lib.oneMinute
    );
  });

  describe('/:address/:currency', () => {
    it(
      'should get the balance by the address and currency',
      async () => {
        await registerIssuerAsync('liang', 'liang');
        await registerAssetAsync(
          'BBB',
          'some description',
          String(10 * 1e8),
          8
        );
        // issue
        const trs = gnyJS.uia.issue(
          'liang.BBB',
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

        const recipient = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const currency = 'BBB';

        const { data } = await axios.get(
          'http://localhost:4096/api/accounts/' + recipient + '/' + currency
        );
        expect(data.balance.address).toBe(recipient);
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

        // Before vote
        const beforeVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(beforeVote.data.delegates).toHaveLength(0);
        await lib.onNewBlock();

        const trs = gnyJS.basic.vote(['xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();
        // After vote
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);
      },
      lib.oneMinute
    );
  });

  describe('/count', () => {
    it(
      'should get the balance',
      async () => {
        const { data } = await axios.get(
          'http://localhost:4096/api/accounts/count'
        );
        expect(data.count).toBe(103);
      },
      lib.oneMinute
    );
  });

  describe('/getPublicKey', () => {
    it(
      'should can not find the public key',
      async () => {
        // Open account
        const query = {
          secret: genesisSecret,
        };
        const account = await axios.post(
          'http://localhost:4096/api/accounts/open',
          query,
          config
        );

        // get the public key
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

        const getPromise = axios.get(
          'http://localhost:4096/api/accounts/getPublicKey?address=' + address
        );
        expect(getPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Can not find public key',
        });
      },
      lib.oneMinute
    );
  });

  describe('/generatePublicKey', () => {
    it(
      'should generate the public key',
      async () => {
        const query = {
          secret: genesisSecret,
        };
        const { data } = await axios.post(
          'http://localhost:4096/api/accounts/generatePublicKey',
          query,
          config
        );
        expect(data).toHaveProperty('publicKey');
      },
      lib.oneMinute
    );
  });
});
