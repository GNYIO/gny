import * as gnyClient from '@gny/client';
import * as lib from '../lib';
import axios from 'axios';
import * as crypto from 'crypto';
import { generateAddress } from '@gny/utils';
import * as ed from '@gny/ed';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

function createKeypair(secret: string) {
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  return ed.generateKeyPair(hash);
}

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const genesisAddress = gnyClient.crypto.getAddress(
  gnyClient.crypto.getKeys(genesisSecret).publicKey
);

async function registerIssuerAsync(name, desc, secret = genesisSecret) {
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

/**
 * Warning: does not wait for new block
 * @param name
 * @param desc
 * @param amount
 * @param precision
 * @param secret
 */
async function registerAssetAsync(
  name,
  desc,
  amount,
  precision,
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

describe('accountsApi', () => {
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

  describe('/', () => {
    it(
      'should get an account by address',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

        const { data } = await axios.get(
          'http://localhost:4096/api/accounts?address=' + address
        );
        expect(data.address).toBe(address);
      },
      lib.oneMinute
    );

    it(
      'should get an account by username',
      async () => {
        const username = 'gny_d1';

        const { data } = await axios.get(
          'http://localhost:4096/api/accounts?username=' + username
        );
        expect(data.username).toBe(username);
      },
      lib.oneMinute
    );

    it(
      'return a default address if address not in db (sad path)',
      async () => {
        const { data } = await axios.get(
          'http://localhost:4096/api/accounts?address=' +
            'GhqtkjpcKRjAvCmmaWCDvzF4C8G7' // random account
        );
        expect(data.success).toBe(true);
        expect(data.address).toBe('GhqtkjpcKRjAvCmmaWCDvzF4C8G7');
        expect(data.username).toBe(null);
        expect(data.gny).toBe(String(0));
        expect(data.publicKey).toBe(null);
        expect(data.secondPublicKey).toBe(null);
        expect(data.isDelegate).toBe(0);
        expect(data.isLocked).toBe(0);
        expect(data.lockHeight).toBe(String(0));
        expect(data.lockAmount).toBe(String(0));
      },
      lib.oneMinute
    );

    it(
      'test sad path for ?username',
      async () => {
        const promise = axios.get(
          'http://localhost:4096/api/accounts?username=' + 'unknownuser'
        );

        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'account with this username not found',
        });
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

    it(
      'should return error: "offset" must be larger than or equal to 0 ',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const offset = -1;

        const promise = axios.get(
          'http://localhost:4096/api/accounts/getBalance/?address=' +
            address +
            '&offset=' +
            offset
        );

        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "offset" fails because ["offset" must be larger than or equal to 0]',
        });
      },
      lib.oneMinute
    );

    it(
      'should return: "limit" must be less than or equal to 100',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const limit = 101;

        const promise = axios.get(
          'http://localhost:4096/api/accounts/getBalance/?address=' +
            address +
            '&limit=' +
            limit
        );

        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "limit" fails because ["limit" must be less than or equal to 100]',
        });
      },
      lib.oneMinute
    );
  });

  describe('/:address/:currency', () => {
    it(
      'should get the balance by the address and currency',
      async () => {
        await registerIssuerAsync('AAA', 'liang');

        // register 3 separate assets to test
        // if the endpoint is returning the right one
        await Promise.all([
          registerAssetAsync('ONE', 'first description', String(10 * 1e8), 8),
          registerAssetAsync('TWO', 'second description', String(11 * 1e8), 8),
          registerAssetAsync('THR', 'third description', String(12 * 1e8), 8),
        ]);
        await lib.onNewBlock();

        // issue
        const trs = gnyClient.uia.issue(
          'AAA.TWO',
          String(11 * 1e8),
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
        const currency = 'AAA.TWO';

        const { data } = await axios.get(
          'http://localhost:4096/api/accounts/' + recipient + '/' + currency
        );
        expect(data.balance.address).toEqual(recipient);
        expect(data.balance.balance).toEqual(String(11 * 1e8));
        expect(data.balance.currency).toEqual('AAA.TWO');

        expect(data.balance.asset).toEqual(
          expect.objectContaining({
            desc: 'second description',
            issuerId: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
            maximum: String(11 * 1e8),
            name: 'AAA.TWO',
            quantity: String(11 * 1e8),
          })
        );
      },
      2 * lib.oneMinute
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
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );
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

        // Before vote
        const beforeVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(beforeVote.data.delegates).toHaveLength(0);
        await lib.onNewBlock();

        const trs = gnyClient.basic.vote(['xpgeng'], genesisSecret);

        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('transactionId');
        await lib.onNewBlock();

        // After vote

        // check with username
        const afterVote = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?username=' + username
        );
        expect(afterVote.data.delegates).toHaveLength(1);

        // check with address
        const afterVote2 = await axios.get(
          'http://localhost:4096/api/accounts/getVotes?address=' +
            genesisAddress
        );
        expect(afterVote2.data.delegates).toHaveLength(1);
      },
      2 * lib.oneMinute
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
      'should return publicKey', // failes because of issue #35
      async () => {
        const address = generateAddress(
          createKeypair(genesisSecret).publicKey.toString('hex')
        );

        const resultPromise = axios.get(
          'http://localhost:4096/api/accounts/getPublicKey?address=' + address
        );

        return expect(resultPromise).resolves.toMatchObject({
          data: {
            success: true,
            publicKey: expect.any(String),
          },
        });
      },
      lib.oneMinute
    );

    it(
      'returns error when publicKey can not be found',
      async () => {
        // get the public key
        const randomAddress = generateAddress(
          crypto.randomBytes(32).toString('hex')
        );

        const getPromise = axios.get(
          'http://localhost:4096/api/accounts/getPublicKey?address=' +
            randomAddress
        );
        expect(getPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Can not find public key',
        });
      },
      lib.oneMinute
    );
  });

  describe('/openAccount', () => {
    it(
      'account that is not in db',
      async () => {
        const params = {
          publicKey:
            '94ae6c8ae05ee1e8d98f445ab9c335290f8826cd6759f01739687e25081482f6',
        };
        const result = await axios.post(
          'http://localhost:4096/api/accounts/openAccount',
          params
        );

        const expected = {
          address: 'G2Jp8u24gU9mpmTgU4fkUUUbMywNF',
          balance: '0',
          secondPublicKey: null,
          lockHeight: '0',
          lockAmount: '0',
          isDelegate: 0,
          username: null,
          publicKey:
            '94ae6c8ae05ee1e8d98f445ab9c335290f8826cd6759f01739687e25081482f6',
        };

        expect(result.data.account).toEqual(expected);
      },
      lib.oneMinute
    );

    it(
      'existing account',
      async () => {
        const recipient = {
          address: 'G2mPyVeWDoVbx2sy6Aunzo6z5udjw',
          secret:
            'soap season put entire seek silk stairs toward cruel kit seven menu',
          publicKey:
            '49201c745ff83fe2f7bbe86cf5da0742ad21e1b027fb0e6ef75a09777d7c75db',
        };

        const trs = gnyClient.basic.transfer(
          recipient.address,
          String(200 * 1e8),
          null,
          genesisSecret
        );
        const nameTransData = {
          transaction: trs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        const params = {
          publicKey: recipient.publicKey,
        };
        const result = await axios.post(
          'http://localhost:4096/api/accounts/openAccount',
          params
        );
        console.log(`result: ${JSON.stringify(result.data, null, 2)}`);

        const expected = {
          address: 'G2mPyVeWDoVbx2sy6Aunzo6z5udjw',
          balance: '20000000000',
          secondPublicKey: null,
          lockHeight: '0',
          lockAmount: '0',
          isDelegate: 0,
          username: null,
          publicKey:
            '49201c745ff83fe2f7bbe86cf5da0742ad21e1b027fb0e6ef75a09777d7c75db',
        };

        expect(result.data.account).toEqual(expected);
      },
      lib.oneMinute
    );
  });
});
