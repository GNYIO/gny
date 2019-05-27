import {
  SET_PENDING_BLOCK,
  ADD_PENDING_VOTES,
  ADD_PENDING_VOTES_SIGNATURES,
  RESET_CONSENSUS,
  SET_VOTES_KEY_SET,
} from './actionTypes';
import { IBlock, ManyVotes, Signature } from '../../../src/interfaces';

export function setPendingBlockAction(block: IBlock) {
  return {
    type: SET_PENDING_BLOCK,
    block,
  };
}

export function addPendingVotesAction(votes: ManyVotes) {
  return {
    type: ADD_PENDING_VOTES,
    votes,
  };
}

export function addPendingVotesSignaturesAction(item: Signature) {
  return {
    type: ADD_PENDING_VOTES_SIGNATURES,
    item,
  };
}

export function resetConsensusAction() {
  return {
    type: RESET_CONSENSUS,
  };
}

export function setVotesKeySetAction(publicKey: string) {
  return {
    type: SET_VOTES_KEY_SET,
    publicKey,
  };
}
