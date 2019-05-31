import { IScope, ManyVotes, IBlock, IState } from '../interfaces';
import { ConsensusBase } from '../base/consensus';
import slots from '../../src/utils/slots';
import {
  setVotesKeySetAction,
  addPendingVotesAction,
  addPendingVotesSignaturesAction,
  setPendingBlockAction,
  resetConsensusAction,
} from '../../packages/functional/redux/consensusActions';

type PendingVotesAndState = {
  allVotes: ManyVotes;
  state: IState;
};

export default class ConsensusManagement {
  // private pendingBlock: IBlock = undefined;
  // private pendingVotes: ManyVotes = undefined;
  // private votesKeySet = new Set();
  private library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  public addPendingVotes(state: IState, votes: ManyVotes) {
    const pendingBlock = state.pendingBlock;
    if (
      !pendingBlock ||
      pendingBlock.height !== votes.height ||
      pendingBlock.id !== votes.id
    ) {
      return {
        allVotes: state.pendingVotes,
        state,
      } as PendingVotesAndState;
    }
    for (let i = 0; i < votes.signatures.length; ++i) {
      const item = votes.signatures[i];
      const votesKeySet = state.votesKeySet;
      if (votesKeySet[item.publicKey]) {
        continue;
      }
      if (ConsensusBase.verifyVote(votes.height, votes.id, item)) {
        state.votesKeySet[item.publicKey] = true;
        const pendingVotes = state.pendingVotes;
        if (!pendingVotes) {
          state.pendingVotes = {
            height: votes.height,
            id: votes.id,
            signatures: [],
          };
        }
        state.pendingVotes.signatures.push(item);
      }
    }
    return {
      allVotes: state.pendingVotes,
      state,
    } as PendingVotesAndState;
  }

  public setPendingBlock(block: IBlock) {
    global.app.store.dispatch(setPendingBlockAction(block));
    // this.pendingBlock = block;
  }

  public hasPendingBlock(timestamp: number) {
    const pendingBlock = global.app.store.getState().pendingBlock;
    if (!pendingBlock) {
      return false;
    }
    return (
      slots.getSlotNumber(pendingBlock.timestamp) ===
      slots.getSlotNumber(timestamp)
    );
  }

  public getPendingBlock() {
    return global.app.store.getState().pendingBlock;
    // return this.pendingBlock;
  }

  public clearState(state: IState) {
    global.app.store.dispatch(resetConsensusAction());

    state.votesKeySet = new Set();
    state.pendingBlock = undefined;
    state.pendingVotes = undefined;

    return state;
  }

  public cleanup = (cb: any) => {
    this.library.logger.debug('Cleaning up core/consensus-management');
    cb();
  };
}
