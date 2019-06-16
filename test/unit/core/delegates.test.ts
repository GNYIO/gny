import Delegates from '../../../src/core/delegates';
import {
  IScope,
  KeyPairsIndexer,
  IBlock,
  Delegate,
  KeyPair,
} from '../../../src/interfaces';
import { BlocksCorrect } from '../../../src/core/blocks-correct';
import * as fs from 'fs';
import * as path from 'path';

interface DelegateTestData {
  delegateList: string[];
  keyPairs: KeyPairsIndexer;
}
function loadDelegatesTestData() {
  const pathToTestData = path.join(
    'test',
    'unit',
    'core',
    'delegates-test.data.json'
  );
  const dataRaw = fs.readFileSync(pathToTestData, { encoding: 'utf8' });
  const notFinshed = JSON.parse(dataRaw);

  Object.keys(notFinshed.keyPairs).forEach(prop => {
    const one = notFinshed.keyPairs[prop];
    one.publicKey = Buffer.from(one.publicKey.data);
    one.privateKey = Buffer.from(one.privateKey.data);

    notFinshed.keyPairs[prop] = one;
  });

  return notFinshed;
}

const dummyLogger = {
  log: x => x,
  trace: x => x,
  debug: x => x,
  info: x => x,
  warn: x => x,
  error: x => x,
  fatal: x => x,
};

describe('core/delegates', () => {
  describe('isLoopReady', () => {
    let delegates: Delegates;
    beforeEach(done => {
      const scope = {
        logger: dummyLogger,
      } as IScope;
      delegates = new Delegates(scope);
      done();
    });
    afterEach(done => {
      delegates = undefined;
      done();
    });

    it('isLoopReady() - forging disabled', done => {
      const state = BlocksCorrect.getInitialState();
      const time = Date.now();
      const isForgingEnabled = false; // test
      const isLoaded = true;
      const isSyncingrightNow = false;
      const keyPairs: KeyPairsIndexer = {};

      const result = delegates.isLoopReady(
        state,
        time,
        isForgingEnabled,
        isLoaded,
        isSyncingrightNow,
        keyPairs
      );

      expect(result).toEqual('Loop: forging disabled');
      done();
    });

    it('isLoopReady() - no delegates', done => {
      const state = BlocksCorrect.getInitialState();
      const time = Date.now();
      const isForgingEnabled = true;
      const isLoaded = true;
      const isSyncingrightNow = false;
      const keyPairs: KeyPairsIndexer = {}; // test

      const result = delegates.isLoopReady(
        state,
        time,
        isForgingEnabled,
        isLoaded,
        isSyncingrightNow,
        keyPairs
      );

      expect(result).toEqual('Loop: no delegates');
      done();
    });

    it('isLoopReady() - not loaded - node not ready', done => {
      const state = BlocksCorrect.getInitialState();
      const time = Date.now();
      const isForgingEnabled = true;
      const isLoaded = false; // test
      const isSyncingrightNow = false;
      const keyPairs: KeyPairsIndexer = {
        c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585: {
          publicKey: Buffer.from('publicKey'),
          privateKey: Buffer.from('privateKey'),
        },
      };

      const result = delegates.isLoopReady(
        state,
        time,
        isForgingEnabled,
        isLoaded,
        isSyncingrightNow,
        keyPairs
      );

      expect(result).toEqual('Loop: node not ready');
      done();
    });

    it('isLoopReady() - isSyncingRightNow - node not ready', done => {
      const state = BlocksCorrect.getInitialState();
      const time = Date.now();
      const isForgingEnabled = true;
      const isLoaded = false;
      const isSyncingrightNow = true; // test
      const keyPairs: KeyPairsIndexer = {
        c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585: {
          publicKey: Buffer.from('publicKey'),
          privateKey: Buffer.from('privateKey'),
        },
      };

      const result = delegates.isLoopReady(
        state,
        time,
        isForgingEnabled,
        isLoaded,
        isSyncingrightNow,
        keyPairs
      );

      expect(result).toEqual('Loop: node not ready');
      done();
    });

    it('isLoopReady() - lastBlock is still in same slot - returns string', done => {
      const state = BlocksCorrect.getInitialState();
      state.lastBlock = {
        // test
        timestamp: 18106090,
      } as IBlock;

      const time = 1560677290282; // test

      const isForgingEnabled = true;
      const isLoaded = true;
      const isSyncingrightNow = false;
      const keyPairs: KeyPairsIndexer = {
        c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585: {
          publicKey: Buffer.from('publicKey'),
          privateKey: Buffer.from('privateKey'),
        },
      };

      const result = delegates.isLoopReady(
        state,
        time,
        isForgingEnabled,
        isLoaded,
        isSyncingrightNow,
        keyPairs
      );

      expect(result).toEqual('Loop: still in last Block slot');
      done();
    });

    it('isLoopReady() - after 5 seconds within Block Slot it is too late to collect votes', done => {
      const state = BlocksCorrect.getInitialState();
      state.lastBlock = {
        timestamp: 18106090,
      } as IBlock;

      const time = 1560677305282; // 1560677305282 % 10000 === 5282

      const isForgingEnabled = true;
      const isLoaded = true;
      const isSyncingrightNow = false;
      const keyPairs: KeyPairsIndexer = {
        c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585: {
          publicKey: Buffer.from('publicKey'),
          privateKey: Buffer.from('privateKey'),
        },
      };

      const result = delegates.isLoopReady(
        state,
        time,
        isForgingEnabled,
        isLoaded,
        isSyncingrightNow,
        keyPairs
      );

      expect(result).toEqual('Loop: maybe too late to collect votes');
      done();
    });

    it('isLoopReady() - works, if it is in next slote after block.lastBlock and under 5 seconds in block slot', done => {
      const state = BlocksCorrect.getInitialState();
      state.lastBlock = {
        timestamp: 18106090,
      } as IBlock;

      const time = 1560677300100; // 1560677300100 % 10000 === 100

      const isForgingEnabled = true;
      const isLoaded = true;
      const isSyncingrightNow = false;
      const keyPairs: KeyPairsIndexer = {
        c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585: {
          publicKey: Buffer.from('publicKey'),
          privateKey: Buffer.from('privateKey'),
        },
      };

      const result = delegates.isLoopReady(
        state,
        time,
        isForgingEnabled,
        isLoaded,
        isSyncingrightNow,
        keyPairs
      );

      expect(result).toBeUndefined();
      done();
    });
  });

  describe('getBlockSlotData', () => {
    let delegates: Delegates;
    let delegatesTestData: DelegateTestData;
    beforeAll(done => {
      delegatesTestData = loadDelegatesTestData();
      done();
    });
    beforeEach(done => {
      const scope = {
        logger: dummyLogger,
      } as IScope;
      delegates = new Delegates(scope);
      done();
    });
    afterEach(done => {
      delegates = undefined;
      done();
    });

    it('getBlockSlotData() - slot 0 (returns delegate at index 0)', done => {
      const slot = 0;

      const result = delegates.getBlockSlotData(
        slot,
        delegatesTestData.delegateList,
        delegatesTestData.keyPairs
      );
      expect(result).toHaveProperty('keypair');
      expect(result).toHaveProperty('time', 0);

      const resultPublicKey =
        result && result.keypair.publicKey.toString('hex');
      const nr = delegatesTestData.delegateList.indexOf(resultPublicKey);
      expect(nr).toEqual(0);
      done();
    });

    it('getBlockSlotData() - slot 1  (returns delegate at index 1)', done => {
      const slot = 1;

      const result = delegates.getBlockSlotData(
        slot,
        delegatesTestData.delegateList,
        delegatesTestData.keyPairs
      );
      expect(result).toHaveProperty('keypair');
      expect(result).toHaveProperty('time', 10);

      const resultPublicKey =
        result && result.keypair.publicKey.toString('hex');
      const nr = delegatesTestData.delegateList.indexOf(resultPublicKey);
      expect(nr).toEqual(1);
      done();
    });

    it('getBlockSlotData() - slot 25  (returns delegate at index 25)', done => {
      const slot = 25;

      const result = delegates.getBlockSlotData(
        slot,
        delegatesTestData.delegateList,
        delegatesTestData.keyPairs
      );
      expect(result).toHaveProperty('keypair');
      expect(result).toHaveProperty('time', 250);

      const resultPublicKey =
        result && result.keypair.publicKey.toString('hex');
      const nr = delegatesTestData.delegateList.indexOf(resultPublicKey);
      expect(nr).toEqual(25);
      done();
    });

    it('getBlockSlotData() - slot 100  (returns delegate at index 100)', done => {
      const slot = 100;

      const result = delegates.getBlockSlotData(
        slot,
        delegatesTestData.delegateList,
        delegatesTestData.keyPairs
      );
      expect(result).toHaveProperty('keypair');
      expect(result).toHaveProperty('time', 1000);

      const resultPublicKey =
        result && result.keypair.publicKey.toString('hex');
      const nr = delegatesTestData.delegateList.indexOf(resultPublicKey);
      expect(nr).toEqual(100);
      done();
    });

    it('getBlockSlotData() - slot 101  (returns delegate at index 0) (modulo)', done => {
      const slot = 101;

      const result = delegates.getBlockSlotData(
        slot,
        delegatesTestData.delegateList,
        delegatesTestData.keyPairs
      );
      expect(result).toHaveProperty('keypair');
      expect(result).toHaveProperty('time', 1010);

      const resultPublicKey =
        result && result.keypair.publicKey.toString('hex');
      const nr = delegatesTestData.delegateList.indexOf(resultPublicKey);
      expect(nr).toEqual(0);
      done();
    });

    it('getBlockSlotData() - slot 102  (returns delegate at index 1) (modulo)', done => {
      const slot = 102;

      const result = delegates.getBlockSlotData(
        slot,
        delegatesTestData.delegateList,
        delegatesTestData.keyPairs
      );
      expect(result).toHaveProperty('keypair');
      expect(result).toHaveProperty('time', 1020);

      const resultPublicKey =
        result && result.keypair.publicKey.toString('hex');
      const nr = delegatesTestData.delegateList.indexOf(resultPublicKey);
      expect(nr).toEqual(1);
      done();
    });
  });

  describe('loadMyDelegates', () => {
    let delegates: Delegates;
    beforeEach(done => {
      const scope = {
        logger: dummyLogger,
      } as IScope;
      delegates = new Delegates(scope);
      done();
    });
    afterEach(done => {
      delegates = undefined;
      done();
    });

    it('loadMyDelegates() - only returns KeyPairs of secrets that are in delegates[]', done => {
      const secret = [
        'carpet pudding topple genuine relax rally problem before pill gun nation method',
        'camp skirt swarm fatal rose daughter forest original artwork mosquito finish patch',
      ];
      const del = [
        {
          publicKey:
            '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9', // for: carpet pudding... secret
        },
      ] as Delegate[];

      const result = delegates.loadMyDelegates(secret, del);

      expect(result).not.toBeUndefined();
      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty(
        '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9'
      );

      done();
    });
  });
});
