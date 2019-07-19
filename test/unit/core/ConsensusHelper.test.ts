import { IBlock, ManyVotes, ITransaction } from '../../../src/interfaces';
import { ConsensusHelper } from '../../../src/core/ConsensusHelper';
import * as ed from '../../../src/utils/ed';
import * as crypto from 'crypto';
import { BlocksHelper } from '../../../src/core/BlocksHelper';
import slots from '../../../src/utils/slots';
import { ConsensusBase } from '../../../src/base/consensus';
import { StateHelper } from '../../../src/core/StateHelper';
import { BigNumber } from 'bignumber.js';

function createRandomBlock(
  height: string = String(6),
  prevBlockId = randomHex(32)
) {
  const keyPair = randomKeyPair();
  const timestamp = slots.getSlotTime(slots.getSlotNumber());

  const lastBlock = {
    id: prevBlockId,
    height: new BigNumber(height).minus(1).toFixed(),
  } as IBlock;
  const unconfirmedTrs: ITransaction[] = [];
  const block = BlocksHelper.generateBlockShort(
    keyPair,
    timestamp,
    lastBlock,
    unconfirmedTrs
  );
  return block;
}

function randomHex(length: number) {
  return crypto.randomBytes(length).toString('hex');
}

function randomKeyPair() {
  const randomstring = randomHex(32);
  const hash = crypto
    .createHash('sha256')
    .update(randomstring, 'utf8')
    .digest();
  return ed.generateKeyPair(hash);
}

describe('ConsensusHelper', () => {
  describe('addPendingVotes', () => {
    it('addPendingVotes() - returns unchanged state if no pendingBlock is available', done => {
      // preparation
      const state = StateHelper.getInitialState();
      expect(state.pendingBlock).toBeUndefined();
      const votes: ManyVotes = {
        height: String(1),
        id: randomHex(32),
        signatures: [],
      };

      // act
      const result = ConsensusHelper.addPendingVotes(state, votes);
      expect(result).toEqual(state);
      expect(result).not.toBe(state); // returns other object reference

      done();
    });

    it('addPendingVotes() - calling function with votes that have not same block "height" as the pendingBlock are not getting added', done => {
      // preparation block 1
      const block1 = {
        height: String(1),
        id: 'id1',
      } as IBlock;
      let state = StateHelper.getInitialState();
      state = ConsensusHelper.setPendingBlock(state, block1);

      const keypairs = [randomKeyPair()];

      // create votes for "almost" the same block (with other height)
      const block2 = {
        height: String(2),
        id: 'id1',
      } as IBlock;
      const votes = ConsensusBase.createVotes(keypairs, block2);

      // pre check: the pendingBlock.id and votes.id are the same
      expect(state.pendingBlock.id).toEqual(votes.id);
      // pre check: the pendingBlock.height and votes.height are NOT the same
      expect(state.pendingBlock.height).not.toEqual(votes.height);

      // act
      const result = ConsensusHelper.addPendingVotes(state, votes);

      // assert that state did not change
      expect(result).toEqual(state);
      expect(result.pendingVotes).toBeUndefined();

      done();
    });

    it('addPendingVotes() - calling function with votes that have not the same block "id" as the pendingBlock are not getting added', done => {
      // preparation block 1
      const block1 = {
        height: String(1),
        id: 'id1',
      } as IBlock;
      let state = StateHelper.getInitialState();
      state = ConsensusHelper.setPendingBlock(state, block1);

      const keypairs = [randomKeyPair()];

      // create votes for "almost" the same block (with other id)
      const block2 = {
        height: String(1),
        id: 'id2',
      } as IBlock;
      const votes = ConsensusBase.createVotes(keypairs, block2);

      // pre check: the pendingBlock.id and votes.id are NOT the same
      expect(state.pendingBlock.id).not.toEqual(votes.id);
      // pre check: the pendingBlock.height and votes.height are the same
      expect(state.pendingBlock.height).toEqual(votes.height);

      // act
      const result = ConsensusHelper.addPendingVotes(state, votes);

      // assert that state did not change
      expect(result).toEqual(state);
      expect(result.pendingVotes).toBeUndefined();

      done();
    });

    it('addingPendingVotes() - adding twice the same vote from a delegate (publicKey) has no effect on pendingVotes signatures', done => {
      // preparation
      const pendingBlock = createRandomBlock(String(1));
      let state = StateHelper.getInitialState();
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      const keypairs = [randomKeyPair()];
      const votes = ConsensusBase.createVotes(keypairs, pendingBlock);

      // first add
      state = ConsensusHelper.addPendingVotes(state, votes);

      // check state
      expect(state.pendingVotes.signatures).toHaveLength(1);

      // second add (with exact same votes)
      const result = ConsensusHelper.addPendingVotes(state, votes);

      expect(result.pendingVotes.signatures).toHaveLength(1);

      done();
    });

    it('addPendingVotes() - adds pendingVotes if no pendingVotes are available yet', done => {
      // prepration, important: first set the pendingBlock
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);
      const keypairs = [randomKeyPair()];

      const pendingVotes = ConsensusBase.createVotes(keypairs, pendingBlock);

      // pre check, currently no pendingVotes
      expect(state.pendingVotes).toBeUndefined();
      // pre check pendingVotes should have 1 signature
      expect(pendingVotes.signatures).toHaveLength(1);

      // act
      const result = ConsensusHelper.addPendingVotes(state, pendingVotes);

      expect(result.pendingVotes).not.toBeUndefined();
      expect(result.pendingVotes.height).toEqual(String(1));
      expect(result.pendingVotes.id).toEqual(pendingBlock.id);
      expect(result.pendingVotes.signatures).toEqual(pendingVotes.signatures);
      expect(result.pendingVotes.signatures).toHaveLength(1);

      done();
    });

    it('addPendingVotes() - calling addPendingVotes() more then once works', done => {
      // prepration, important: first set the pendingBlock
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      // first act
      const firstKeypairs = [randomKeyPair()];
      const firstVotes = ConsensusBase.createVotes(firstKeypairs, pendingBlock);
      const firstResult = ConsensusHelper.addPendingVotes(state, firstVotes);

      // check after first act
      expect(firstResult.pendingVotes.signatures).toHaveLength(1);

      // second act
      const secondKeypairs = [randomKeyPair()];
      const secondVotes = ConsensusBase.createVotes(
        secondKeypairs,
        pendingBlock
      );
      const result = ConsensusHelper.addPendingVotes(firstResult, secondVotes);

      // check
      expect(result.pendingVotes.signatures).toHaveLength(2);

      done();
    });
  });

  describe('setPendingBlock', () => {
    it('setPendingBlock() - sets pendingBlock and returns other state object reference', done => {
      const state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(3));

      const result = ConsensusHelper.setPendingBlock(state, pendingBlock);

      expect(result.pendingBlock).toEqual(pendingBlock);
      expect(result).not.toBe(state); // other object reference gets returned

      done();
    });
  });

  describe('hasPendingBlock', () => {
    it('hasPendingBlock() - returns false if state has no pendingBlock', done => {
      const state = StateHelper.getInitialState();
      const timestamp = Date.now();

      const result = ConsensusHelper.hasPendingBlock(state, timestamp);

      expect(result).toEqual(false);

      done();
    });

    it('hasPendingBlock() - returns true if state has pendingBlock and currentTimestamp are in the same slot', done => {
      // preparation
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));

      // make test not brittle, block.timestamp and currentTimestamp should be the same
      const nowInEpochTime = slots.getEpochTime(undefined);
      pendingBlock.timestamp = nowInEpochTime;
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      // pre check
      expect(state.pendingBlock.timestamp).toEqual(nowInEpochTime);

      // act
      const result = ConsensusHelper.hasPendingBlock(state, nowInEpochTime);
      expect(result).toEqual(true);

      done();
    });

    it('hasPendingBlock() - returns false if timestamp of pendingBlock was 10 seconds before current timestamp', done => {
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));

      // make test not brittle, block.timestamp and currentTimestamp should originate from same timestamp
      // pendingBlock.timestamp is 10 seconds before "nowInEpochTime" variable
      const currentTimestamp = Date.now();
      const oldTimestamp = currentTimestamp - 10000;

      const currentEpochTime = slots.getEpochTime(currentTimestamp);
      const oldEpochTime = slots.getEpochTime(oldTimestamp);

      pendingBlock.timestamp = oldEpochTime; // pendingBlock was 10 seconds before

      // pre check
      const slot1 = slots.getSlotNumber(currentEpochTime);
      const slot2 = slots.getSlotNumber(pendingBlock.timestamp);
      expect(slot1).toEqual(slot2 + 1);

      // prepare state
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);
      // pre check: state has pendingBlock
      expect(state.pendingBlock).not.toBeUndefined();

      // act
      const result = ConsensusHelper.hasPendingBlock(state, currentEpochTime);

      expect(result).toEqual(false);
      done();
    });
  });

  describe('getPendingBlock', () => {
    it('getPendingBlock() - returns no pendingBlock if there is not one', done => {
      const state = StateHelper.getInitialState();

      const result = ConsensusHelper.getPendingBlock(state);
      expect(result).toBeUndefined();

      done();
    });

    it('getPendingBlock() - returns pendingblock if there is one', done => {
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      const result = ConsensusHelper.getPendingBlock(state);
      expect(result).toEqual(pendingBlock);

      done();
    });
  });

  describe('clearState', () => {
    it('clearState() - resets pendingBlock, pendingVotes and votesKeySet', done => {
      // preparation
      let state = StateHelper.getInitialState();

      // set pendingBlock
      const pendingBlock = createRandomBlock(String(1));
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      // add pendingVotes
      const keypairs = [randomKeyPair(), randomKeyPair(), randomKeyPair()];
      const pendingVotes = ConsensusBase.createVotes(keypairs, pendingBlock);
      state = ConsensusHelper.addPendingVotes(state, pendingVotes);

      // pre check
      expect(state.pendingBlock).not.toBeUndefined();
      expect(state.pendingVotes).not.toBeUndefined();
      expect(state.pendingVotes.signatures).toHaveLength(3);
      expect(Object.keys(state.votesKeySet).length).toEqual(3);

      // act
      const result = ConsensusHelper.clearState(state);

      // after check
      expect(result.pendingBlock).toBeUndefined();
      expect(result.pendingVotes).toBeUndefined();
      expect(Object.keys(result.votesKeySet).length).toEqual(0);

      done();
    });

    describe('CollectingVotes', () => {
      it('CollectingVotes() - set the privIsCollectingVotes prop to true', done => {
        const state = StateHelper.getInitialState();

        // pre check
        expect(state.privIsCollectingVotes).toEqual(false);

        const result = ConsensusHelper.CollectingVotes(state);

        expect(result.privIsCollectingVotes).toEqual(true);
        expect(result).not.toBe(state); // returned state is is other object reference

        done();
      });
    });
  });
});
