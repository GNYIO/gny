import Delegates from '../../../src/core/delegates';
import { KeyPairsIndexer, IBlock, Delegate } from '../../../src/interfaces';
import * as fs from 'fs';
import * as path from 'path';
import { StateHelper } from '../../../src/core/StateHelper';

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
    it('isLoopReady() - forging disabled', done => {
      const state = StateHelper.getInitialState();
      const time = Date.now();
      const isForgingEnabled = false; // test
      const isLoaded = true;
      const isSyncingrightNow = false;
      const keyPairs: KeyPairsIndexer = {};

      const result = Delegates.isLoopReady(
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
      const state = StateHelper.getInitialState();
      const time = Date.now();
      const isForgingEnabled = true;
      const isLoaded = true;
      const isSyncingrightNow = false;
      const keyPairs: KeyPairsIndexer = {}; // test

      const result = Delegates.isLoopReady(
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
      const state = StateHelper.getInitialState();
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

      const result = Delegates.isLoopReady(
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
      const state = StateHelper.getInitialState();
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

      const result = Delegates.isLoopReady(
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
      const state = StateHelper.getInitialState();
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

      const result = Delegates.isLoopReady(
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
      const state = StateHelper.getInitialState();
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

      const result = Delegates.isLoopReady(
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
      const state = StateHelper.getInitialState();
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

      const result = Delegates.isLoopReady(
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
    let delegatesTestData: DelegateTestData;
    beforeAll(done => {
      delegatesTestData = loadDelegatesTestData();
      done();
    });

    it('getBlockSlotData() - slot 0 (returns delegate at index 0)', done => {
      const slot = 0;

      const result = Delegates.getBlockSlotData(
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

      const result = Delegates.getBlockSlotData(
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

      const result = Delegates.getBlockSlotData(
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

      const result = Delegates.getBlockSlotData(
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

      const result = Delegates.getBlockSlotData(
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

      const result = Delegates.getBlockSlotData(
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

    it('getBlockSlotData() - returns old slot if delegate secret is not available for this slot', done => {
      const slot = 1;

      const delegateList = delegatesTestData.delegateList;
      const shortKeyPairs: KeyPairsIndexer = {
        '763f529207e9d3437a6dbdf022fc8c31c79744afe7a0a422bf684b97961f2635': {
          publicKey: Buffer.from(
            '763f529207e9d3437a6dbdf022fc8c31c79744afe7a0a422bf684b97961f2635',
            'hex'
          ),
          privateKey: Buffer.from([
            7,
            95,
            224,
            127,
            91,
            243,
            251,
            170,
            154,
            154,
            85,
            151,
            69,
            59,
            85,
            145,
            252,
            12,
            71,
            72,
            105,
            68,
            60,
            225,
            232,
            254,
            241,
            239,
            232,
            237,
            115,
            194,
            118,
            63,
            82,
            146,
            7,
            233,
            211,
            67,
            122,
            109,
            189,
            240,
            34,
            252,
            140,
            49,
            199,
            151,
            68,
            175,
            231,
            160,
            164,
            34,
            191,
            104,
            75,
            151,
            150,
            31,
            38,
            53,
          ]),
        },
      };
      const result = Delegates.getBlockSlotData(
        slot,
        delegateList,
        shortKeyPairs
      );

      const publicThatWasReturned =
        result && result.keypair.publicKey.toString('hex');
      expect(publicThatWasReturned).toEqual(
        '763f529207e9d3437a6dbdf022fc8c31c79744afe7a0a422bf684b97961f2635'
      );

      const expectedTime = 10;
      expect(result).toHaveProperty('time');
      expect(result.time).not.toEqual(expectedTime);

      done();
    });
  });

  describe('loadMyDelegates', () => {
    beforeEach(done => {
      global.library = {
        logger: dummyLogger,
      };
      done();
    });
    afterEach(done => {
      global.library = {};
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

      const result = Delegates.loadMyDelegates(secret, del);

      expect(result).not.toBeUndefined();
      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty(
        '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9'
      );

      done();
    });
  });

  describe('getActiveDelegateKeypairs', () => {
    let delegatesTestData: DelegateTestData;

    beforeAll(done => {
      delegatesTestData = loadDelegatesTestData();
      done();
    });
    beforeEach(done => {
      StateHelper.SetKeyPairs(delegatesTestData.keyPairs);
      done();
    });
    afterEach(done => {
      const emptyKeyPairs: KeyPairsIndexer = {};
      StateHelper.SetKeyPairs(emptyKeyPairs);
      done();
    });

    it('getActiveDelegateKeypairs() - passing empty array returns empty array', done => {
      const del: string[] = [];

      const result = Delegates.getActiveDelegateKeypairs(del);
      expect(result).toEqual([]);

      done();
    });

    it('getActiveDelegateKeypairs() - passing in undefined returns empty array', done => {
      const del = undefined;

      const result = Delegates.getActiveDelegateKeypairs(del);
      expect(result).toEqual([]);
      done();
    });

    it('getActiveDelegateKeypairs() - returns only keyPairs that are in this.keyPairs', done => {
      // preparation
      const oneDelegateKeyPair: KeyPairsIndexer = {
        '763f529207e9d3437a6dbdf022fc8c31c79744afe7a0a422bf684b97961f2635':
          delegatesTestData.keyPairs[
            '763f529207e9d3437a6dbdf022fc8c31c79744afe7a0a422bf684b97961f2635'
          ],
      };
      StateHelper.SetKeyPairs(oneDelegateKeyPair);

      // act
      const result = Delegates.getActiveDelegateKeypairs(
        delegatesTestData.delegateList
      );

      expect(result).not.toBeUndefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('publicKey');
      expect(result[0].publicKey.toString('hex')).toEqual(
        '763f529207e9d3437a6dbdf022fc8c31c79744afe7a0a422bf684b97961f2635'
      );

      done();
    });
  });

  describe('compare', () => {
    it('compare() - sorts delegates after votes', done => {
      const delegates = [
        {
          publicKey: 'second',
          votes: 2,
        },
        {
          publicKey: 'one',
          votes: 5,
        },
      ] as Delegate[];

      const result = delegates.sort(Delegates.compare);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        publicKey: 'one',
        votes: 5,
      });
      expect(result[1]).toEqual({
        publicKey: 'second',
        votes: 2,
      });

      done();
    });

    it('compare() - sorts delegates after votes and then after publicKey descending', done => {
      const delegates = [
        {
          publicKey: 'aaa',
          votes: 10,
        },
        {
          publicKey: 'bbb',
          votes: 10,
        },
      ] as Delegate[];

      const result = delegates.sort(Delegates.compare);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        publicKey: 'bbb',
        votes: 10,
      });
      expect(result[1]).toEqual({
        publicKey: 'aaa',
        votes: 10,
      });

      done();
    });
  });
});
