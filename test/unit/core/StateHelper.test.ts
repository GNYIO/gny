import { StateHelper } from '../../../src/core/StateHelper';
import { IBlock } from '../../../packages/interfaces';
import { IState } from '../../../src/globalInterfaces';

function resetGlobalState() {
  global.state = {} as IState;
}

describe('StateHelper', () => {
  describe('getInitialState', () => {
    it('getInitialState() - matches blue print', done => {
      const initialState = StateHelper.getInitialState();

      expect(initialState).toEqual({
        votesKeySet: {},
        pendingBlock: undefined,
        pendingVotes: undefined,

        lastBlock: undefined,
        blockCache: {},

        proposeCache: {},
        lastPropose: null,
        privIsCollectingVotes: false,
        lastVoteTime: undefined,
      });

      done();
    });

    it('getInitialState() - returns always a new object reference', done => {
      const first = StateHelper.getInitialState();
      const second = StateHelper.getInitialState();

      // structure equals
      expect(first).toEqual(second);
      // object reference is different
      expect(first).not.toBe(second);

      done();
    });
  });

  describe('setState()', () => {
    beforeEach(cb => {
      resetGlobalState();
      cb();
    });
    afterEach(cb => {
      resetGlobalState();
      cb();
    });

    it('setState() - set global', done => {
      // check before
      const oldState = StateHelper.getState();
      expect(oldState).toEqual({});

      // act
      const newState = {
        lastBlock: {
          height: String(-1),
        },
      } as IState;
      StateHelper.setState(newState);

      // check after
      const updatedState = StateHelper.getState();
      expect(updatedState).toEqual({
        lastBlock: {
          height: String(-1),
        },
      });
      done();
    });
  });

  describe('getState()', () => {
    beforeEach(cb => {
      const state = {
        privIsCollectingVotes: true,
      } as IState;
      StateHelper.setState(state);
      cb();
    });
    afterEach(cb => {
      resetGlobalState();
      cb();
    });

    it('getState() - returns current state', done => {
      const state = StateHelper.getState();
      expect(state).toEqual({
        privIsCollectingVotes: true,
      });
      done();
    });

    it('getState() - returns same values but other object reference', done => {
      const state = {
        privIsCollectingVotes: false,
      } as IState;
      StateHelper.setState(state);

      const result = StateHelper.getState();

      expect(result).toEqual(state); // values are the same
      expect(result).not.toBe(state); // object reference is not the same

      done();
    });

    it('getState() - returns same values but deepCopy (also for nested objects)', done => {
      const lastBlock = {
        height: String(10),
      } as IBlock;
      const state = {
        privIsCollectingVotes: false,
        lastBlock,
      } as IState;
      StateHelper.setState(state);

      const result = StateHelper.getState();

      expect(result).toEqual(state); // values are the same
      expect(result).not.toBe(state); // object reference is not the same

      // check nested object
      expect(result.lastBlock).toEqual(state.lastBlock);
      expect(result.lastBlock).not.toBe(state.lastBlock);

      done();
    });
  });
});
