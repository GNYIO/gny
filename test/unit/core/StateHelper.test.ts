import { StateHelper } from '../../../packages/main/src/core/StateHelper';
import { IBlock } from '../../../packages/interfaces';
import { IState } from '../../../packages/main/src/globalInterfaces';

function resetGlobalState() {
  global.state = {} as IState;
}

describe('StateHelper', () => {
  describe('getInitialState', () => {
    it('getInitialState() - matches blue print', () => {
      const initialState = StateHelper.getInitialState();

      expect(initialState).toEqual({
        votesKeySet: {},
        pendingBlock: undefined,
        pendingVotes: undefined,

        lastBlock: undefined,

        proposeCache: {},
        lastPropose: null,
        privIsCollectingVotes: false,
        lastVoteTime: undefined,
      });
    });

    it('getInitialState() - returns always a new object reference', () => {
      const first = StateHelper.getInitialState();
      const second = StateHelper.getInitialState();

      // structure equals
      expect(first).toEqual(second);
      // object reference is different
      expect(first).not.toBe(second);
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

    it('setState() - set global', () => {
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

    it('getState() - returns current state', () => {
      const state = StateHelper.getState();
      expect(state).toEqual({
        privIsCollectingVotes: true,
      });
    });

    it('getState() - returns same values but other object reference', () => {
      const state = {
        privIsCollectingVotes: false,
      } as IState;
      StateHelper.setState(state);

      const result = StateHelper.getState();

      expect(result).toEqual(state); // values are the same
      expect(result).not.toBe(state); // object reference is not the same
    });

    it('getState() - returns same values but deepCopy (also for nested objects)', () => {
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
    });
  });
});
