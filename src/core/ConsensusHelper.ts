import { ManyVotes, IBlock, IState } from '../interfaces';
import { ConsensusBase } from '../base/consensus';
import slots from '../../src/utils/slots';

export class ConsensusHelper {
  public static addPendingVotes(state: IState, votes: ManyVotes) {
    const pendingBlock = state.pendingBlock;
    if (
      !pendingBlock ||
      pendingBlock.height !== votes.height ||
      pendingBlock.id !== votes.id
    ) {
      return state;
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
    return state;
  }

  public static setPendingBlock(state: IState, block: IBlock) {
    state.pendingBlock = block;
    return state;
  }

  public static hasPendingBlock(state: IState, timestamp: number) {
    const pendingBlock = state.pendingBlock;
    if (!pendingBlock) {
      return false;
    }
    return (
      slots.getSlotNumber(pendingBlock.timestamp) ===
      slots.getSlotNumber(timestamp)
    );
  }

  public static getPendingBlock(state: IState) {
    return state.pendingBlock;
  }

  public static clearState(state: IState) {
    state.votesKeySet = new Set();
    state.pendingBlock = undefined;
    state.pendingVotes = undefined;

    return state;
  }
}
