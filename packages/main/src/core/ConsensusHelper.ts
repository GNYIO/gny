import { ManyVotes, IBlock } from '@gny/interfaces';
import { IState } from '../globalInterfaces.js';
import { ConsensusBase } from '@gny/base';
import { slots } from '@gny/utils';
import { copyObject } from '@gny/base';
import { StateHelper } from './StateHelper.js';
import { ISpan, getSmallBlockHash } from '@gny/tracer';

export class ConsensusHelper {
  public static createPendingBlockAndVotes(
    oldState: IState,
    oldBlock: IBlock,
    oldVotes: ManyVotes,
    parentSpan: ISpan
  ) {
    const state = StateHelper.copyState(oldState);
    const block = copyObject(oldBlock);
    const votes = copyObject(oldVotes);

    const span = global.library.tracer.startSpan('create pending votes', {
      childOf: parentSpan.context(),
    });
    span.setTag('height', block.height);
    span.setTag('hash', getSmallBlockHash(block));

    // safety first
    if (block.id !== votes.id || block.height !== votes.height) {
      span.setTag('error', true);
      span.log({
        value: `createPendingBlockAndVotes check fails. Id or height do not match`,
        'block.id': block.id,
        'block.height': block.height,
        'votes.id': votes.id,
        'votes.height': votes.height,
      });
      span.finish();
      throw new Error('block and votes not the same');
    }

    if (votes.signatures.length === 0) {
      span.setTag('error', true);
      span.log({
        value: 'no signatures passed in',
        block,
        votes,
      });
      span.finish();
      throw new Error('no signatures passed in');
    }

    const verified = votes.signatures.every(item => {
      return ConsensusBase.verifyVote(votes.height, votes.id, item);
    });

    if (verified == false) {
      span.setTag('error', true);
      span.log({
        value: 'not all signatures are valid',
        block,
        votes,
      });
      span.finish();
      throw new Error('not all signatures are valid');
    }

    // set pendingBlock and pendingVotes
    state.pendingBlock = block;
    state.pendingVotes = votes;

    for (let i = 0; i < votes.signatures.length; ++i) {
      const item = votes.signatures[i];
      state.votesKeySet[item.publicKey] = true;
    }

    span.log({
      pendingBlock: state.pendingBlock,
      pendingVotes: state.pendingVotes,
    });
    span.finish();

    const votesSpan = global.library.tracer.startSpan('add votes', {
      childOf: span.context(),
    });
    votesSpan.log({
      count: votes.signatures.length,
      sum: votes.signatures.length,
    });
    votesSpan.finish();

    return state;
  }

  public static doIncomingVotesFitInLine(
    oldState: IState,
    oldVotes: ManyVotes
  ) {
    const state = StateHelper.copyState(oldState);
    const votes = copyObject(oldVotes);

    const pendingBlock = state.pendingBlock;
    const pendingVotes = state.pendingVotes;

    const pendingBlockIsObject = typeof pendingBlock === 'object';
    const pendingVotesIsObject = typeof pendingVotes === 'object';
    const votesIsObject = typeof votes === 'object';

    if (!pendingBlockIsObject || !pendingVotesIsObject || !votesIsObject) {
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingBlockIsObject: ${pendingBlockIsObject}`
      );
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingVotesIsObject: ${pendingVotesIsObject}`
      );
      global.library.logger.info(
        `[doIncomingVotesFitInLine] votesIsObject ${votesIsObject}`
      );

      return false;
    }

    const pendingBlockIdIsString = typeof pendingBlock.id === 'string';
    const pendingVotesIdIsString = typeof pendingVotes.id === 'string';
    const votesIdIdIsString = typeof votes.id === 'string';

    if (
      !pendingBlockIdIsString ||
      !pendingVotesIdIsString ||
      !votesIdIdIsString
    ) {
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingBlockIdIsString: ${pendingBlockIdIsString}`
      );
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingVotesIdIsString: ${pendingVotesIdIsString}`
      );
      global.library.logger.info(
        `[doIncomingVotesFitInLine] votesIdIdIsString: ${votesIdIdIsString}`
      );

      return false;
    }

    const pendingBlockHeight_is_correct = /^[0-9]+$/.test(pendingBlock.height);
    const pendingVotesHeight_is_correct = /^[0-9]+$/.test(pendingVotes.height);
    const votesHeight_is_correct = /^[0-9]+$/.test(votes.height);

    if (
      !pendingBlockHeight_is_correct ||
      !pendingVotesHeight_is_correct ||
      !votesHeight_is_correct
    ) {
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingBlockHeight_is_correct: ${pendingBlockHeight_is_correct}`
      );
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingVotesHeight_is_correct: ${pendingVotesHeight_is_correct}`
      );
      global.library.logger.info(
        `[doIncomingVotesFitInLine] votesHeight_is_correct: ${votesHeight_is_correct}`
      );

      return false;
    }

    const pendingBlockId_is_pendingVotesid =
      pendingBlock.id === pendingVotes.id;
    const pendingVotesId_is_votesId = pendingVotes.id === votes.id;

    if (!pendingBlockId_is_pendingVotesid || !pendingVotesId_is_votesId) {
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingBlockId_is_pendingVotesid: ${pendingBlockId_is_pendingVotesid}`
      );
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingVotesId_is_votesId: ${pendingVotesId_is_votesId}`
      );

      return false;
    }

    const pendingBlockHeight_is_pendingVotesHeight =
      pendingBlock.height === pendingVotes.height;
    const pendingVotesHeight_is_votesHeight =
      pendingVotes.height === votes.height;

    if (
      !pendingBlockHeight_is_pendingVotesHeight ||
      !pendingVotesHeight_is_votesHeight
    ) {
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingBlockHeight_is_pendingVotesHeight: ${pendingBlockHeight_is_pendingVotesHeight}`
      );
      global.library.logger.info(
        `[doIncomingVotesFitInLine] pendingVotesHeight_is_votesHeight: ${pendingVotesHeight_is_votesHeight}`
      );

      return false;
    }

    return true;
  }

  /**
   * This function expects that there exists a pendingBlock and pendingVotes
   * @param oldState
   * @param oldVotes
   * @param parentSpan
   */
  public static addPendingVotes(
    oldState: IState,
    oldVotes: ManyVotes,
    parentSpan: ISpan
  ) {
    const state = StateHelper.copyState(oldState);
    const votes = copyObject(oldVotes);

    const span = global.library.tracer.startSpan('add necessary votes', {
      childOf: parentSpan.context(),
    });

    const pendingBlock = state.pendingBlock;
    if (!pendingBlock) {
      span.setTag('error', true);
      span.log({
        value: 'no pending block',
      });
      span.finish();

      throw new Error('no pending block');
    }

    span.setTag('height', pendingBlock.height);
    span.setTag('hash', getSmallBlockHash(pendingBlock));

    global.library.logger.info(
      `[votes][addPendingVotes] we currently have "${
        state.pendingVotes ? state.pendingVotes.signatures.length : 0
      }" pending Votes for block ${pendingBlock.id}, h: ${pendingBlock.height}`
    );

    if (pendingBlock.id !== votes.id || pendingBlock.height !== votes.height) {
      span.setTag('error', true);
      span.log({
        value: 'votes and block do not match',
        pendingBlock,
        votes,
      });

      throw new Error('votes and block do not match');
    }

    const verified = votes.signatures.every(item => {
      return ConsensusBase.verifyVote(votes.height, votes.id, item);
    });

    if (verified == false) {
      span.setTag('error', true);
      span.log({
        value: 'not all signatures are valid',
        pendingBlock,
        votes,
      });
      span.finish();
      throw new Error('not all signatures are valid');
    }

    let count = 0;

    for (let i = 0; i < votes.signatures.length; ++i) {
      const item = votes.signatures[i];
      const votesKeySet = state.votesKeySet;
      // check if same vote is already there
      if (votesKeySet[item.publicKey]) {
        continue;
      }
      if (ConsensusBase.verifyVote(votes.height, votes.id, item)) {
        state.votesKeySet[item.publicKey] = true;
        state.pendingVotes.signatures.push(item);
        ++count;
      }
    }
    global.library.logger.info(
      `[votes][addPendingVotes] after adding votes this node has now "${
        state.pendingVotes ? state.pendingVotes.signatures.length : 0
      }" votes for block ${pendingBlock.id}, h: ${pendingBlock.height}`
    );

    span.finish();

    const votesSpan = global.library.tracer.startSpan('add votes', {
      childOf: span.context(),
    });
    votesSpan.log({
      count,
      sum: state.pendingVotes.signatures.length,
    });
    votesSpan.finish();

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

  public static clearState(old: IState) {
    const state = StateHelper.copyState(old);

    state.votesKeySet = {};
    state.pendingBlock = undefined;
    state.pendingVotes = undefined;

    return state;
  }

  public static CollectingVotes(old: IState) {
    const state = StateHelper.copyState(old);

    state.privIsCollectingVotes = true;
    return state;
  }
}
