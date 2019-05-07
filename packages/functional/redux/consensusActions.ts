import {
  SET_PENDING_BLOCK,
  ADD_PENDING_VOTES,
  RESET_CONSENSUS,
} from './actionTypes';
import { IBlock, ManyVotes } from '../../../src/interfaces';

export function setPendingBlock(block: IBlock) {
  return {
    type: SET_PENDING_BLOCK,
    block,
  };
}

export function addPendingVotes(votes: ManyVotes) {
  return {
    type: ADD_PENDING_VOTES,
    votes,
  };
}

export function resetConsensus() {
  return {
    type: RESET_CONSENSUS,
  };
}
