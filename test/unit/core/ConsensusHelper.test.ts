import {
  IBlock,
  ManyVotes,
  ITransaction,
  ILogger,
} from '../../../packages/interfaces';
import { ConsensusHelper } from '../../../packages/main/src/core/ConsensusHelper';
import * as ed from '../../../packages/ed';
import * as crypto from 'crypto';
import { BlocksHelper } from '../../../packages/main/src/core/BlocksHelper';
import { slots } from '../../../packages/utils/src/slots';
import { ConsensusBase } from '../../../packages/base/src/consensusBase';
import { StateHelper } from '../../../packages/main/src/core/StateHelper';
import { BigNumber } from 'bignumber.js';
import { ISpan } from '../../../packages/tracer/dist';

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

function createSpan(): ISpan {
  const val: ISpan = {
    context: () => {},
    finish: () => null,
    log: () => null,
    setTag: () => null,
  };
  return val;
}

describe('ConsensusHelper', () => {
  beforeEach(() => {
    const logger: ILogger = {
      log: x => x,
      trace: x => x,
      debug: x => x,
      info: x => x,
      warn: x => x,
      error: x => x,
      fatal: x => x,
    };

    const tracer = {
      startSpan: () => createSpan(),
    };

    global.library = {
      logger,
      tracer,
    };
  });

  afterEach(() => {
    delete global.library;
  });

  describe('addPendingVotes', () => {
    it('addPendingVotes() - throws if there is no pendingBlock', () => {
      // preparation
      const state = StateHelper.getInitialState();
      expect(state.pendingBlock).toBeUndefined();

      const newBlock = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        newBlock
      );

      // act
      const testSpan = global.library.tracer.startSpan('test');
      return expect(() =>
        ConsensusHelper.addPendingVotes(state, votes, testSpan)
      ).toThrowError('no pending block');
    });

    it('addPendingVotes() - throws if votes id do not match pendingBlock id', () => {
      // preparation
      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(3));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        block
      );
      const testSpan = global.library.tracer.startSpan('test');
      const temp = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        testSpan
      );

      // votes from a peer
      const votes2: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );
      // mess up the votes id (from a peer)
      votes2.id = 'some bad id';

      const testSpan2 = global.library.tracer.startSpan('test2');
      return expect(() =>
        ConsensusHelper.addPendingVotes(temp, votes2, testSpan2)
      ).toThrowError('votes and block do not match');
    });

    it('addPendingVotes() - throws if votes height do not match pendingBlock height', () => {
      // preparation
      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(3));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        block
      );
      const testSpan = global.library.tracer.startSpan('test');
      const temp = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        testSpan
      );

      // votes from a peer
      const votes2: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );
      // mess up the votes height (from a peer)
      votes2.height = String(9);

      const testSpan2 = global.library.tracer.startSpan('test2');
      return expect(() =>
        ConsensusHelper.addPendingVotes(temp, votes2, testSpan2)
      ).toThrowError('votes and block do not match');
    });

    it('addingPendingVotes() - throws if any signature is wrong', () => {
      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(3));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );

      const spanTest = global.library.tracer.startSpan('test');
      const temp = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        spanTest
      );

      // create votes with wrong signatures
      const votes2: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair()],
        createRandomBlock(String(5))
      );
      votes2.id = votes.id; // only the signatures should be wrong for this test
      votes2.height = votes.height; // only the signatures should be wrong for this test

      const spanTest2 = global.library.tracer.startSpan('test');
      return expect(() =>
        ConsensusHelper.addPendingVotes(temp, votes2, spanTest2)
      ).toThrowError('not all signatures are valid');
    });
  });

  describe('createPendingBlockAndVotes', () => {
    it('createPendingBlockAndVotes() - sets pendingBlock and pendingVotes', done => {
      const state = StateHelper.getInitialState();
      const newBlock = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        newBlock
      );

      expect(votes.height).toEqual(String(1));
      expect(votes.id).toEqual(newBlock.id);
      expect(votes.signatures).toHaveLength(1);

      const testSpan = global.library.tracer.startSpan('test');
      const result = ConsensusHelper.createPendingBlockAndVotes(
        state,
        newBlock,
        votes,
        testSpan
      );

      expect(result).not.toBe(state); // other object reference gets returned

      expect(result.pendingBlock).toEqual(newBlock);
      expect(result.pendingVotes).toEqual(votes);

      expect(result.pendingBlock.id).toEqual(newBlock.id);
      expect(result.pendingBlock.height).toEqual(newBlock.height);

      expect(result.pendingVotes.id).toEqual(votes.id);
      expect(result.pendingVotes.height).toEqual(votes.height);

      randomKeyPair;
      return done();
    });

    it('createPendingBlockAndVotes() - throws when one wrong signature is passed in', () => {
      // create ManyVotes that have wrong signature
      const block = createRandomBlock(String(3));
      const votes = ConsensusBase.createVotes(
        [randomKeyPair()],
        createRandomBlock(String(2))
      );
      votes.height = block.height;
      votes.id = block.id;

      const state = StateHelper.getInitialState();
      const testSpan = global.library.tracer.startSpan('test');
      return expect(() =>
        ConsensusHelper.createPendingBlockAndVotes(
          state,
          block,
          votes,
          testSpan
        )
      ).toThrowError('not all signatures are valid');
    });

    it('createPendingBlockAndVotes() - throw if not at least one correct vote gets passed in', () => {
      const block = createRandomBlock(String(2));
      // votes without signatures
      const votes: ManyVotes = {
        id: block.id,
        height: block.height,
        signatures: [],
      };

      const state = StateHelper.getInitialState();
      const testSpan = global.library.tracer.startSpan('test');

      return expect(() =>
        ConsensusHelper.createPendingBlockAndVotes(
          state,
          block,
          votes,
          testSpan
        )
      ).toThrowError('no signatures passed in');
    });

    it('createPendingBlockAndVotes() - throws if votes id is different than block id', () => {
      const block = createRandomBlock(String(5));
      const votes = ConsensusBase.createVotes([randomKeyPair()], block);
      // mess up votes.id
      votes.id = 'wrong id';

      const testSpan = global.library.tracer.startSpan('test');
      const state = StateHelper.getInitialState();

      return expect(() =>
        ConsensusHelper.createPendingBlockAndVotes(
          state,
          block,
          votes,
          testSpan
        )
      ).toThrowError('block and votes not the same');
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
      const block = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair()],
        block
      );

      // make test not brittle, block.timestamp and currentTimestamp should be the same
      const nowInEpochTime = slots.getEpochTime(undefined);
      block.timestamp = nowInEpochTime;

      // set pending block
      const testSpan = global.library.tracer.startSpan('test');
      state = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        testSpan
      );

      // pre check
      expect(state.pendingBlock.timestamp).toEqual(nowInEpochTime);

      // act
      const result = ConsensusHelper.hasPendingBlock(state, nowInEpochTime);
      expect(result).toEqual(true);

      done();
    });

    it('hasPendingBlock() - returns false if timestamp of pendingBlock was 10 seconds before current timestamp', done => {
      let state = StateHelper.getInitialState();
      const block = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );

      // make test not brittle, block.timestamp and currentTimestamp should originate from same timestamp
      // pendingBlock.timestamp is 10 seconds before "nowInEpochTime" variable
      const currentTimestamp = Date.now();
      const oldTimestamp = currentTimestamp - 10000;

      const currentEpochTime = slots.getEpochTime(currentTimestamp);
      const oldEpochTime = slots.getEpochTime(oldTimestamp);

      block.timestamp = oldEpochTime; // pendingBlock was 10 seconds before

      // pre check
      const slot1 = slots.getSlotNumber(currentEpochTime);
      const slot2 = slots.getSlotNumber(block.timestamp);
      expect(slot1).toEqual(slot2 + 1);

      // prepare state
      const testSpan = global.library.tracer.startSpan('test');
      state = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        testSpan
      );
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
      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(2));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        block
      );

      const spanTest = global.library.tracer.startSpan('test');
      const tempState = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        spanTest
      );

      const result = ConsensusHelper.getPendingBlock(tempState);
      expect(result).toEqual(block);

      done();
    });
  });

  describe('clearState', () => {
    it('clearState() - resets pendingBlock, pendingVotes and votesKeySet', done => {
      // preparation
      const state = StateHelper.getInitialState();

      // set pendingBlock
      const block = createRandomBlock(String(1));
      const votes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );
      const spanTest = global.library.tracer.startSpan('test');
      const temp = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        spanTest
      );

      // pre check
      expect(temp.pendingBlock).not.toBeUndefined();
      expect(temp.pendingVotes).not.toBeUndefined();
      expect(temp.pendingVotes.signatures).toHaveLength(3);
      expect(Object.keys(temp.votesKeySet).length).toEqual(3);

      // act
      const result = ConsensusHelper.clearState(temp);

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
