import { IScope, ManyVotes, IBlock } from '../interfaces';
import { ConsensusBase } from '../base/consensus';
import slots from '../../src/utils/slots';

export default class ConsensusManagement {
  private pendingBlock: IBlock = undefined;
  private pendingVotes: ManyVotes = undefined;
  private votesKeySet = new Set();
  private library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  public addPendingVotes(votes: ManyVotes) {
    if (
      !this.pendingBlock ||
      this.pendingBlock.height !== votes.height ||
      this.pendingBlock.id !== votes.id
    ) {
      return this.pendingVotes;
    }
    for (let i = 0; i < votes.signatures.length; ++i) {
      const item = votes.signatures[i];
      if (this.votesKeySet[item.publicKey]) {
        continue;
      }
      if (ConsensusBase.verifyVote(votes.height, votes.id, item)) {
        this.votesKeySet[item.publicKey] = true;
        if (!this.pendingVotes) {
          this.pendingVotes = {
            height: votes.height,
            id: votes.id,
            signatures: [],
          } as ManyVotes;
        }
        this.pendingVotes.signatures.push(item);
      }
    }
    return this.pendingVotes;
  }

  public setPendingBlock(block: IBlock) {
    this.pendingBlock = block;
  }

  public hasPendingBlock(timestamp: number) {
    if (!this.pendingBlock) {
      return false;
    }
    return (
      slots.getSlotNumber(this.pendingBlock.timestamp) ===
      slots.getSlotNumber(timestamp)
    );
  }

  public getPendingBlock() {
    return this.pendingBlock;
  }

  public clearState() {
    this.pendingVotes = undefined;
    this.votesKeySet = new Set();
    this.pendingBlock = undefined;
  }

  public cleanup = (cb: any) => {
    this.library.logger.debug('Cleaning up core/consensus-management');
    cb();
  };
}
