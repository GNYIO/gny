import { IScope, ManyVotes, IBlock } from '../interfaces';
import { ConsensusBase } from '../base/consensus';
import slots from '../../src/utils/slots';
import {
  setVotesKeySetAction,
  addPendingVotesAction,
  addPendingVotesSignaturesAction,
  setPendingBlockAction,
  resetConsensusAction,
} from '../../packages/functional/redux/consensusActions';

export default class ConsensusManagement {
  // private pendingBlock: IBlock = undefined;
  // private pendingVotes: ManyVotes = undefined;
  // private votesKeySet = new Set();
  private library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  public addPendingVotes(votes: ManyVotes) {
    const pendingBlock = global.app.store.getState().pendingBlock;
    if (
      !pendingBlock ||
      pendingBlock.height !== votes.height ||
      pendingBlock.id !== votes.id
    ) {
      return global.app.store.getState().pendingVotes;
    }
    for (let i = 0; i < votes.signatures.length; ++i) {
      const item = votes.signatures[i];
      const votesKeySet = global.app.store.getState().votesKeySet;
      if (votesKeySet[item.publicKey]) {
        continue;
      }
      if (ConsensusBase.verifyVote(votes.height, votes.id, item)) {
        global.app.store.dispatch(setVotesKeySetAction(item.publicKey));
        // this.votesKeySet[item.publicKey] = true;
        const pendingVotes = global.app.store.getState().pendingVotes;
        if (!pendingVotes) {
          global.app.store.dispatch(
            addPendingVotesAction({
              height: votes.height,
              id: votes.id,
              signatures: [],
            })
          );
        }
        global.app.store.dispatch(addPendingVotesSignaturesAction(item));
        // this.pendingVotes.signatures.push(item);
      }
    }
    return global.app.store.getState().pendingVotes;
    // return this.pendingVotes;
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

  public clearState() {
    global.app.store.dispatch(resetConsensusAction());
    // this.pendingVotes = undefined;
    // this.votesKeySet = new Set();
    // this.pendingBlock = undefined;
  }

  public cleanup = (cb: any) => {
    this.library.logger.debug('Cleaning up core/consensus-management');
    cb();
  };
}
