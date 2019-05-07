import {
  SET_PENDING_BLOCK,
  ADD_PENDING_VOTES,
  RESET_CONSENSUS,
} from './actionTypes';

export default (state = {}, action) => {
  switch (action.type) {
    case SET_PENDING_BLOCK:
      return {
        ...state,
        pendingBlock: action.pendingBlock,
      };
    case ADD_PENDING_VOTES:
      return {
        ...state,
        pendingVotes: action.pendingVotes,
      };
    case RESET_CONSENSUS:
      return {};
    default:
      return state;
  }
};
