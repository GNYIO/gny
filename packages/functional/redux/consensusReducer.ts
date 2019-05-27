import {
  SET_PENDING_BLOCK,
  ADD_PENDING_VOTES,
  RESET_CONSENSUS,
  SET_VOTES_KEY_SET,
  ADD_PENDING_VOTES_SIGNATURES,
} from './actionTypes';

const initialState = {
  votesKeySet: new Set(),
  pendingBlock: undefined,
  pendingVotes: undefined,
};

export default (state = initialState, action) => {
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

    case ADD_PENDING_VOTES_SIGNATURES:
      return {
        ...state,
        pendingVotes: state.pendingVotes.signatures.push(action.item),
      };

    case RESET_CONSENSUS:
      return {
        votesKeySet: new Set(),
        pendingBlock: undefined,
        pendingVotes: undefined,
      };

    case SET_VOTES_KEY_SET:
      const votesKeySet = (state.votesKeySet[action.publicKey] = true); // todo: copy set
      return {
        ...state,
        votesKeySet,
      };

    default:
      return state;
  }
};
