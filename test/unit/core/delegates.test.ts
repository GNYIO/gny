import Delegates from '../../../src/core/delegates';
import { IScope, KeyPairsIndexer, IBlock } from '../../../src/interfaces';
import { BlocksCorrect } from '../../../src/core/blocks-correct';
import { doesNotReject } from 'assert';

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

    it.skip('isLoopReady() - forging disabled', done => {
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
});
