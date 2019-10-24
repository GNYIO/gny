import * as lib from '../lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

function newSignature(secret: string) {
  const keys = gnyClient.crypto.getKeys(secret);
  const signature = {
    publicKey: keys.publicKey,
  };
  return signature;
}

async function setSecondPassPhrase(secondPassPhrase: string) {
  const trs = gnyClient.basic.setSecondPassphrase(
    genesisSecret,
    secondPassPhrase
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
}

describe('contract-env - basic.setSecondPassphrase', () => {
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

  describe('fee', () => {
    it('basic.setSecondPassphrase correct fee is 5 GNY', async done => {
      const basicSetSecondPassphrase = gnyClient.basic.setSecondPassphrase(
        genesisSecret,
        'second'
      );

      expect(basicSetSecondPassphrase.fee).toEqual(String(5 * 1e8));

      const transData = {
        transaction: basicSetSecondPassphrase,
      };

      const { data } = await axios.post(
        'http://localhost:4096/peer/transactions',
        transData,
        config
      );

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('transactionId');

      done();
    });

    it('basic.setSecondPassphrase too small fee returns error', async () => {
      const secondSignature = newSignature('secret');
      const SMALLER_FEE = String(4 * 1e8);
      const trans = gnyClient.transaction.createTransactionEx({
        type: 2,
        fee: SMALLER_FEE,
        args: [secondSignature.publicKey],
        secret: genesisSecret,
      });

      const transData = {
        transaction: trans,
      };

      const contractPromise = axios.post(
        'http://localhost:4096/peer/transactions',
        transData,
        config
      );

      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        success: false,
        error: 'Error: Fee not enough',
      });
    });
  });

  describe('args', () => {
    it('basic.setSecondPassphrase adding extra arguments to args array throws error', async () => {
      const secondSignature = newSignature('second');
      const trans = gnyClient.transaction.createTransactionEx({
        type: 2,
        fee: String(5 * 1e8),
        args: [secondSignature.publicKey, 'additionalArgument'],
        secret: genesisSecret,
      });

      const transData = {
        transaction: trans,
      };
      const contractPromise = axios.post(
        'http://localhost:4096/peer/transactions',
        transData,
        config
      );
      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        success: false,
        error: 'Error: Invalid arguments length',
      });
    });

    it('basic.setSecondPassphrase calling contract with too few arguments throws error', async () => {
      const trans = gnyClient.transaction.createTransactionEx({
        type: 2,
        fee: String(5 * 1e8),
        args: [],
        secret: genesisSecret,
      });

      const transData = {
        transaction: trans,
      };
      const contractPromise = axios.post(
        'http://localhost:4096/peer/transactions',
        transData,
        config
      );
      return expect(contractPromise).rejects.toHaveProperty('response.data', {
        success: false,
        error: 'Error: Invalid arguments length',
      });
    });
  });

  describe('no contract should be called after contract secondPassPhrase without secondPassPhrase', () => {
    describe('basic', () => {
      it(
        'basic.transfer after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicTransfer = gnyClient.basic.transfer(
            lib.createRandomAddress(),
            String(22 * 1e8),
            undefined,
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicTransfer,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'basic.lock after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicLock = gnyClient.basic.lock(
            173000,
            30 * 1e8,
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicLock,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'basic.registerDelegate after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.basic.registerDelegate(
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'basic.setUserName after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.basic.setUserName(
            'liangpeili',
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'basic.unlock after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.basic.unlock(
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'basic.unvote after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.basic.unvote(
            [],
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'basic.vote after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.basic.vote(
            [],
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );
    });

    describe('uia', () => {
      it(
        'uia.registerIssuer after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.uia.registerIssuer(
            'liang',
            'liang',
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'uia.registerAsset after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.uia.registerAsset(
            'BBB',
            'some description',
            String(10 * 1e8),
            8,
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'uia.issue after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.uia.issue(
            'ABC.BBB',
            String(10 * 1e8),
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'uia.transfer after basic.setSecondPassphrase (without secondPassPhrase) throws error',
        async () => {
          await setSecondPassPhrase('second');

          const SECOND_SECRET = undefined;
          const basicRegisterDelegate = gnyClient.uia.transfer(
            'ABC.BBB',
            String(10 * 1e8),
            lib.createRandomAddress(),
            undefined,
            genesisSecret,
            SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Second signature not provided',
            }
          );
        },
        lib.oneMinute
      );
    });
  });

  describe('calling setSecondPassPhrase then invoking other contracts where trs are signed with 2nd secret', () => {
    describe('basic', () => {
      it(
        'basic.transfer after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          const basicTransfer = gnyClient.basic.transfer(
            lib.createRandomAddress(),
            String(22 * 1e8),
            undefined,
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const transData = {
            transaction: basicTransfer,
          };
          expect(basicTransfer).toHaveProperty('secondSignature');
          expect(typeof basicTransfer.secondSignature).toEqual('string');
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );

          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );

      it(
        'basic.lock after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          const basicLock = gnyClient.basic.lock(
            173000,
            30 * 1e8,
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const transData = {
            transaction: basicLock,
          };
          expect(basicLock).toHaveProperty('secondSignature');
          expect(typeof basicLock.secondSignature).toEqual('string');
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );

      it(
        'basic.registerDelegate after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          // prepare (setUserName)
          const setUserName = gnyClient.basic.setUserName(
            'a1300',
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const setUserNameTransData = {
            transaction: setUserName,
          };
          expect(setUserName).toHaveProperty('secondSignature');
          expect(typeof setUserName.secondSignature).toEqual('string');
          await axios.post(
            'http://localhost:4096/peer/transactions',
            setUserNameTransData,
            config
          );
          await lib.onNewBlock();

          // act
          const basicRegisterDelegate = gnyClient.basic.registerDelegate(
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );

          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );

      it(
        'basic.setUserName after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');

          const VALID_SECOND_SECRET = 'second';
          const basicSetUserName = gnyClient.basic.setUserName(
            'liangpeili',
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(basicSetUserName).toHaveProperty('secondSignature');
          expect(typeof basicSetUserName.secondSignature).toEqual('string');
          const transData = {
            transaction: basicSetUserName,
          };
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );

      it(
        'basic.unlock after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async () => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          // we can not wait for 173000 blocks after a "lock", so we directly try to "unlock" (which will fail), but we test only the secondSignature
          const basicUnlock = gnyClient.basic.unlock(
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const transData = {
            transaction: basicUnlock,
          };
          expect(basicUnlock).toHaveProperty('secondSignature');
          expect(typeof basicUnlock.secondSignature).toEqual('string');
          const contractPromise = axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          return expect(contractPromise).rejects.toHaveProperty(
            'response.data',
            {
              success: false,
              error: 'Error: Account is not locked',
            }
          );
        },
        lib.oneMinute
      );

      it(
        'basic.unvote after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          // prepare (lock)
          const basicLock = gnyClient.basic.lock(
            173000,
            30 * 1e8,
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(basicLock).toHaveProperty('secondSignature');
          expect(typeof basicLock.secondSignature).toEqual('string');
          const basicLockTransData = {
            transaction: basicLock,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            basicLockTransData,
            config
          );
          await lib.onNewBlock();

          // prepare (vote)
          const basicVote = gnyClient.basic.vote(
            ['gny_d72'],
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(basicVote).toHaveProperty('secondSignature');
          expect(typeof basicVote.secondSignature).toEqual('string');
          const basicVoteTransData = {
            transaction: basicVote,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            basicVoteTransData,
            config
          );
          await lib.onNewBlock();

          const basicUnvote = gnyClient.basic.unvote(
            ['gny_d72'],
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const basicUnvoteTransData = {
            transaction: basicUnvote,
          };
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            basicUnvoteTransData,
            config
          );
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );

      it(
        'basic.vote after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          // prepare (lock)
          const basicLock = gnyClient.basic.lock(
            173000,
            30 * 1e8,
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(basicLock).toHaveProperty('secondSignature');
          expect(typeof basicLock.secondSignature).toEqual('string');
          const basicLockTransData = {
            transaction: basicLock,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            basicLockTransData,
            config
          );
          await lib.onNewBlock();

          // act
          const basicVote = gnyClient.basic.vote(
            ['gny_d72'],
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const transData = {
            transaction: basicVote,
          };
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );
    });

    describe('uia', () => {
      it(
        'uia.registerIssuer after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          // act
          const uiaRegisterIssuer = gnyClient.uia.registerIssuer(
            'liang',
            'some desc',
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(uiaRegisterIssuer).toHaveProperty('secondSignature');
          expect(typeof uiaRegisterIssuer.secondSignature).toEqual('string');
          const transData = {
            transaction: uiaRegisterIssuer,
          };
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );

      it(
        'uia.registerAsset after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          // preparation (register issuer)
          const uiaRegisterIssuer = gnyClient.uia.registerIssuer(
            'ABC',
            'some desc',
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(uiaRegisterIssuer).toHaveProperty('secondSignature');
          expect(typeof uiaRegisterIssuer.secondSignature).toEqual('string');
          const uiaRegisterIssuerTransData = {
            transaction: uiaRegisterIssuer,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            uiaRegisterIssuerTransData,
            config
          );
          await lib.onNewBlock();

          // act
          const basicRegisterDelegate = gnyClient.uia.registerAsset(
            'BBB',
            'some description',
            String(10 * 1e8),
            8,
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );

      it(
        'uia.issue after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          // preparation (register issuer)
          const uiaRegisterIssuer = gnyClient.uia.registerIssuer(
            'ABC',
            'some desc',
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(uiaRegisterIssuer).toHaveProperty('secondSignature');
          expect(typeof uiaRegisterIssuer.secondSignature).toEqual('string');
          const uiaRegisterIssuerTransData = {
            transaction: uiaRegisterIssuer,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            uiaRegisterIssuerTransData,
            config
          );
          await lib.onNewBlock();

          // preparation (register asset)
          const uiaRegisterAsset = gnyClient.uia.registerAsset(
            'BBB',
            'some desc',
            String(10 * 1e8),
            8,
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(uiaRegisterAsset).toHaveProperty('secondSignature');
          expect(typeof uiaRegisterAsset.secondSignature).toEqual('string');
          const uiaRegisterAssetTransData = {
            transaction: uiaRegisterAsset,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            uiaRegisterAssetTransData,
            config
          );
          await lib.onNewBlock();

          // act
          const basicRegisterDelegate = gnyClient.uia.issue(
            'ABC.BBB',
            String(10 * 1e8),
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const transData = {
            transaction: basicRegisterDelegate,
          };
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );

      it(
        'uia.transfer after basic.setSecondPassphrase (signed with secondPassPhrase) succeeds',
        async done => {
          await setSecondPassPhrase('second');
          const VALID_SECOND_SECRET = 'second';

          // preparation (register issuer)
          const uiaRegisterIssuer = gnyClient.uia.registerIssuer(
            'ABC',
            'some desc',
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(uiaRegisterIssuer).toHaveProperty('secondSignature');
          expect(typeof uiaRegisterIssuer.secondSignature).toEqual('string');
          const uiaRegisterIssuerTransData = {
            transaction: uiaRegisterIssuer,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            uiaRegisterIssuerTransData,
            config
          );
          await lib.onNewBlock();

          // preparation (register asset)
          const uiaRegisterAsset = gnyClient.uia.registerAsset(
            'BBB',
            'some desc',
            String(10 * 1e8),
            8,
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(uiaRegisterAsset).toHaveProperty('secondSignature');
          expect(typeof uiaRegisterAsset.secondSignature).toEqual('string');
          const uiaRegisterAssetTransData = {
            transaction: uiaRegisterAsset,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            uiaRegisterAssetTransData,
            config
          );
          await lib.onNewBlock();

          // preparation (issue asset)
          const uiaIssueAsset = gnyClient.uia.issue(
            'ABC.BBB',
            String(10 * 1e8),
            genesisSecret,
            VALID_SECOND_SECRET
          );
          expect(uiaIssueAsset).toHaveProperty('secondSignature');
          expect(typeof uiaIssueAsset.secondSignature).toEqual('string');
          const uiaIssueAssetTransData = {
            transaction: uiaIssueAsset,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            uiaIssueAssetTransData,
            config
          );
          await lib.onNewBlock();

          // act
          const uiaTransfer = gnyClient.uia.transfer(
            'ABC.BBB',
            String(10 * 1e8),
            lib.createRandomAddress(),
            undefined,
            genesisSecret,
            VALID_SECOND_SECRET
          );
          const transData = {
            transaction: uiaTransfer,
          };
          const { data } = await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('transactionId');

          done();
        },
        lib.oneMinute
      );
    });
  });
});
