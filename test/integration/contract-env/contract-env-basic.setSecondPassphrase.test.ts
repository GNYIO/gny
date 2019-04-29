import * as lib from '../lib';
import * as gnyJS from '../../../packages/gny-js';
import axios from 'axios';
import { doesNotReject } from 'assert';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

async function setSecondPassPhrase(secondPassPhrase: string) {
  const trs = gnyJS.basic.setSecondPassphrase(genesisSecret, secondPassPhrase);
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

  it('basic.setSecondPassphrase correct fee is 5 GNY', async done => {
    const basicSetSecondPassphrase = gnyJS.basic.setSecondPassphrase(
      genesisSecret,
      'second'
    );

    expect(basicSetSecondPassphrase.fee).toEqual(5 * 1e8);

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

  it.skip('basic.setSecondPassphrase too small fee returns error', async () => {});

  it.skip('basic.setSecondPassphrase adding extra arguments to args array throws error', async () => {});

  it.skip('basic.setSecondPassphrase calling contract with too few arguments throws error', async () => {});

  describe('after setting secondPassPhrase no other contract should be called without secondPassPhrase', () => {
    it(
      'basic.transfer after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicTransfer = gnyJS.basic.transfer(
          lib.createRandomAddress(),
          22 * 1e8,
          undefined,
          genesisSecret
        ); // no second PassPhrase!!!
        const transData = {
          transaction: basicTransfer,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'basic.lock after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicLock = gnyJS.basic.lock(173000, 30 * 1e8, genesisSecret); // no second PassPhrase!!!
        const transData = {
          transaction: basicLock,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'basic.registerDelegate after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.basic.registerDelegate(
          genesisSecret
        ); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'basic.setUserName after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.basic.setUserName(
          'liangpeili',
          genesisSecret
        ); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'basic.unlock after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.basic.unlock(genesisSecret); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'basic.unvote after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.basic.unvote([], genesisSecret); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'basic.vote after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.basic.vote([], genesisSecret); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'uia.registerIssuer after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.uia.registerIssuer(
          'liang',
          'liang',
          genesisSecret
        ); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'uia.registerAsset after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        ); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'uia.issue after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.uia.issue(
          'ABC.BBB',
          String(10 * 1e8),
          genesisSecret
        ); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );

    it(
      'uia.issue after basic.setSecondPassphrase without secondPassPhrase',
      async () => {
        await setSecondPassPhrase('second');

        const basicRegisterDelegate = gnyJS.uia.transfer(
          'ABC.BBB',
          String(10 * 1e8),
          lib.createRandomAddress(),
          undefined,
          genesisSecret
        ); // no second PassPhrase!!!
        const transData = {
          transaction: basicRegisterDelegate,
        };
        const contractPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Second signature not provided',
        });
      },
      lib.oneMinute
    );
  });
});
