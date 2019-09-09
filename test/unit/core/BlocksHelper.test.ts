import { BlocksHelper } from '../../../src/core/BlocksHelper';
import {
  ITransaction,
  IConfig,
  IBlock,
  KeyPair,
  BlockPropose,
  IGenesisBlock,
  NewBlockMessage,
} from '../../../packages/interfaces';
import * as crypto from 'crypto';
import { generateAddress } from '../../../packages/utils/address';
import * as ed from '../../../packages/ed';
import * as fs from 'fs';
import { ConsensusHelper } from '../../../src/core/ConsensusHelper';
import { slots } from '../../../packages/utils/slots';
import { StateHelper } from '../../../src/core/StateHelper';
import { BigNumber } from 'bignumber.js';

const dummyLogger = {
  log: x => x,
  trace: x => x,
  debug: x => x,
  info: x => x,
  warn: x => x,
  error: x => x,
  fatal: x => x,
};

function loadGenesisBlock() {
  const genesisBlockRaw = fs.readFileSync('genesisBlock.json', {
    encoding: 'utf8',
  });
  const genesisBlock: IGenesisBlock = JSON.parse(genesisBlockRaw);
  return genesisBlock;
}

function createRandomBlock(
  height: string = String(6),
  prevBlockId = randomHex(32)
) {
  const keyPair = randomKeyPair();
  const timestamp = slots.getSlotNumber(slots.getSlotNumber());
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

function createRandomBlockPropose(
  height: string,
  generatorPublicKey = randomHex(32),
  id = randomHex(32)
) {
  const propose: BlockPropose = {
    address: randomAddress(),
    hash: randomHex(64),
    height,
    generatorPublicKey,
    id,
    signature: randomHex(64),
    timestamp: 124242243693,
  };
  return propose;
}

function randomKeyPair() {
  const secret = '';
  const keypair: KeyPair = ed.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(secret, 'utf8')
      .digest()
  );
  return keypair;
}

function randomHex(length: number) {
  return crypto.randomBytes(length).toString('hex');
}

function randomAddress() {
  return generateAddress(randomHex(32));
}

function createRandomTransaction() {
  const publicKey = randomHex(32);
  const transaction: ITransaction = {
    id: randomHex(32),
    args: [],
    height: String(3),
    senderPublicKey: publicKey,
    senderId: generateAddress(publicKey),
    timestamp: 12424,
    type: 0,
    fee: String(0.1 * 1e8),
  };
  return transaction;
}

describe('BlocksHelper', () => {
  describe('pure functions', () => {
    it('AreTransactionsDuplicated() - returns false if no transaction-ID is duplicated', done => {
      const transactions = [
        {
          id: 'first',
        },
        {
          id: 'second',
        },
        {
          id: 'third',
        },
      ] as ITransaction[];

      const result = BlocksHelper.AreTransactionsDuplicated(transactions);
      expect(result).toEqual(false);

      done();
    });

    it('AreTransactionsDuplicated() - returns true if transaction-IDs are duplicated', done => {
      const transactions = [
        {
          id: 'first',
        },
        {
          id: 'second',
        },
        {
          id: 'second',
        },
      ] as ITransaction[];

      const result = BlocksHelper.AreTransactionsDuplicated(transactions);
      expect(result).toEqual(true);

      done();
    });

    it('CanAllTransactionsBeSerialized() - returns true if for all transaction getBytes() can be called', done => {
      const transactions = [
        createRandomTransaction(),
        createRandomTransaction(),
        createRandomTransaction(),
      ];

      const result = BlocksHelper.CanAllTransactionsBeSerialized(transactions);
      expect(result).toEqual(true);

      done();
    });

    it('CanAllTransactionsBeSerialized() - returns false if for any transaction getBytes can not be called', done => {
      const correctTrs = createRandomTransaction();
      const wrongTrs = createRandomTransaction();
      delete wrongTrs.timestamp;

      const transactions = [correctTrs, wrongTrs];
      const result = BlocksHelper.CanAllTransactionsBeSerialized(transactions);
      expect(result).toEqual(false);

      done();
    });

    it('CanAllTransactionsBeSerialized() - returns true if empty transactions array is passed in', done => {
      const transactions = [];

      const result = BlocksHelper.CanAllTransactionsBeSerialized(transactions);
      expect(result).toEqual(true);

      done();
    });

    it('CanAllTransactionsBeSerialized() - throws if no transactions array is passed in', done => {
      const transactions = null;

      expect(() =>
        BlocksHelper.CanAllTransactionsBeSerialized(transactions)
      ).toThrow('transactions are null');

      done();
    });

    it.skip('ManageProposeCreation() - create propose', done => {
      const keypair = null;
      const block = {} as IBlock;
      const config: Partial<IConfig> = {
        publicIp: '0.0.0.0',
        peerPort: 4097,
      };
      // act
      const result = BlocksHelper.ManageProposeCreation(keypair, block, config);

      expect(result.address).toEqual(`${config.publicIp}:${config.peerPort}`);
      expect(result.generatorPublicKey).toEqual(block.delegate);
      expect(result.hash).toEqual(null);
      expect(result.height).toEqual(block.height);
      expect(typeof result.height).toEqual('string');
      expect(result.id).toEqual(block.id);
      expect(result.signature).toEqual(null);
      expect(result.timestamp).toEqual(block.timestamp);

      done();
    });

    it('NotEnoughActiveKeyPairs() - returns false if one KeyPair is provided', done => {
      const keypairs = [randomKeyPair()];

      const result = BlocksHelper.NotEnoughActiveKeyPairs(keypairs);
      expect(result).toEqual(false);

      done();
    });

    it('NotEnoughActiveKeyPairs() - returns true if empty array is provided', done => {
      const keypairs = [];

      const result = BlocksHelper.NotEnoughActiveKeyPairs(keypairs);
      expect(result).toEqual(true);

      done();
    });

    it('NotEnoughActiveKeyPairs() - returns true if null value is provided', done => {
      const keypairs = null;

      const result = BlocksHelper.NotEnoughActiveKeyPairs(keypairs);
      expect(result).toEqual(true);

      done();
    });

    it('generateBlockShort() - generates block', done => {
      const keypair = randomKeyPair();
      const timestamp = 1343434;
      const lastBlock = {
        id: randomHex(32),
        height: String(2),
      } as IBlock;
      const unconfirmedTransactions = [];

      // act
      const result = BlocksHelper.generateBlockShort(
        keypair,
        timestamp,
        lastBlock,
        unconfirmedTransactions
      );

      expect(result.prevBlockId).toEqual(lastBlock.id);
      expect(result.count).toEqual(unconfirmedTransactions.length);
      expect(result.delegate).toEqual(keypair.publicKey.toString('hex'));

      expect(typeof result.fees).toEqual('string');
      expect(result.fees).toEqual(String(0));

      expect(typeof result.reward).toEqual('string');
      expect(result.reward).toEqual(String(0));

      expect(result.timestamp).toEqual(timestamp);
      expect(result.transactions).toEqual(unconfirmedTransactions);
      expect(result.version).toEqual(0);

      expect(typeof result.height).toEqual('string');
      expect(result.height).toEqual(
        new BigNumber(lastBlock.height).plus(1).toFixed()
      );

      expect(typeof result.id).toEqual('string');
      expect(typeof result.payloadHash).toEqual('string');
      expect(typeof result.signature).toEqual('string');

      done();
    });

    it(
      'areTransactionsExceedingPayloadLength() - returns true if bytes of all transaction exceeding threshold',
      done => {
        const transactions: ITransaction[] = [];

        for (let i = 0; i < 180000; ++i) {
          const x = createRandomTransaction();
          transactions.push(x);
        }

        const result = BlocksHelper.areTransactionsExceedingPayloadLength(
          transactions
        );
        expect(result).toEqual(true);

        done();
      },
      20 * 1000
    );

    it('areTransactionsExceedingPayloadLength() - returns false if bytes of all transaction are not exceeding threshold', done => {
      const transactions: ITransaction[] = [];

      for (let i = 0; i < 999; ++i) {
        const x = createRandomTransaction();
        transactions.push(x);
      }

      const result = BlocksHelper.areTransactionsExceedingPayloadLength(
        transactions
      );
      expect(result).toEqual(false);

      done();
    });

    it('getFeesOfAll() - get fees of all transactions', done => {
      const trs1 = createRandomTransaction();
      const trs2 = createRandomTransaction();
      const trs3 = createRandomTransaction();

      expect(trs1.fee).toEqual(String(0.1 * 1e8));
      expect(trs2.fee).toEqual(String(0.1 * 1e8));
      expect(trs3.fee).toEqual(String(0.1 * 1e8));

      const transactions = [trs1, trs2, trs3];

      const fees = BlocksHelper.getFeesOfAll(transactions);
      expect(fees).toEqual(String(0.3 * 1e8));

      done();
    });

    it('getFeesOfAll() - sums over all transaction fees, also when they are not provided', done => {
      const trs1 = createRandomTransaction();
      delete trs1.fee;
      const trs2 = createRandomTransaction();
      const trs3 = createRandomTransaction();

      expect(trs1.fee).toBeUndefined();
      expect(trs2.fee).toEqual(String(0.1 * 1e8));
      expect(trs3.fee).toEqual(String(0.1 * 1e8));

      const transactions = [trs1, trs2, trs3];

      const fees = BlocksHelper.getFeesOfAll(transactions);
      expect(fees).toEqual(String(0.2 * 1e8));

      done();
    });

    it('payloadHashOfAllTransactions() - returns hash of all transactions', done => {
      const transactions = [
        createRandomTransaction(),
        createRandomTransaction(),
      ];

      const hash = BlocksHelper.payloadHashOfAllTransactions(transactions);
      expect(Buffer.isBuffer(hash)).toEqual(true);

      const hex = hash.toString('hex');
      expect(typeof hex).toEqual('string');
      expect(hex).toHaveLength(64);

      done();
    });

    it('payloadHashOfAllTransactions() - works for empty transactions array', done => {
      const transactions: ITransaction[] = [];

      const hash = BlocksHelper.payloadHashOfAllTransactions(transactions);
      expect(Buffer.isBuffer(hash)).toEqual(true);

      const hex = hash.toString('hex');
      expect(typeof hex).toEqual('string');
      expect(hex).toHaveLength(64);

      done();
    });

    it('DoesNewBlockProposeMatchOldOne() - returns true if height, generatorPublicKey', done => {
      // preparation
      const id = randomHex(32);
      const generatorPublicKey = randomHex(32);
      const height = String(11);

      // prepare state
      const state = StateHelper.getInitialState();
      state.lastPropose = {
        id,
        generatorPublicKey,
        height,
      } as BlockPropose;

      // prepare propose
      const propose = createRandomBlockPropose(String(11), generatorPublicKey);

      // double check
      expect(state.lastPropose.id).not.toEqual(propose.id);

      // act
      const result = BlocksHelper.DoesNewBlockProposeMatchOldOne(
        state,
        propose
      );

      expect(result).toEqual(true);
      done();
    });

    it('DoesNewBlockProposeMatchOldOne() - returns false if lastPropose does not exists', done => {
      // preparation
      const initialState = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(2));

      // act
      const result = BlocksHelper.DoesNewBlockProposeMatchOldOne(
        initialState,
        propose
      );

      expect(result).toEqual(false);
      done();
    });

    it('DoesNewBlockProposeMatchOldOne() - returns false if height does not match', done => {
      // preparation
      const state = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(2));
      state.lastPropose = propose;
      state.lastPropose.height = String(3); // different

      // act
      const result = BlocksHelper.DoesNewBlockProposeMatchOldOne(
        state,
        propose
      );

      expect(result).toEqual(false);
      done();
    });

    it('DoesNewBlockProposeMatchOldOne() - returns false if generatorPublicKey does not match', done => {
      // preparation
      const state = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(2));
      state.lastPropose = propose;
      state.lastPropose.generatorPublicKey = randomHex(32); // different

      // act
      const result = BlocksHelper.DoesNewBlockProposeMatchOldOne(
        state,
        propose
      );

      expect(result).toEqual(false);
      done();
    });

    it('AlreadyReceivedPropose() - returns false when ProposeCache is empty', done => {
      const state = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(10));

      const result = BlocksHelper.AlreadyReceivedPropose(state, propose);

      expect(result).toEqual(false);
      done();
    });

    it('AlreadyReceivedPropose() - returns true when Propose hash was already received', done => {
      // preparation
      const propose = createRandomBlockPropose(String(10));

      let state = StateHelper.getInitialState();
      state = BlocksHelper.MarkProposeAsReceived(state, propose);

      // act
      const result = BlocksHelper.AlreadyReceivedPropose(state, propose);

      expect(result).toEqual(true);
      done();
    });

    it('MarkProposeAsReceived() - returns new object reference', done => {
      const initialState = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(10));

      const updatedState = BlocksHelper.MarkProposeAsReceived(
        initialState,
        propose
      );

      expect(initialState).not.toBe(updatedState);
      done();
    });

    it('MarkProposeAsReceived() - marks propose as received', done => {
      const initialState = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(10));

      const updatedState = BlocksHelper.MarkProposeAsReceived(
        initialState,
        propose
      );

      expect(updatedState.proposeCache[propose.hash]).toEqual(true);
      done();
    });

    it('AlreadyReceivedThisBlock() - returns false if cache is empty', done => {
      const initialState = StateHelper.getInitialState();
      const block = createRandomBlock();

      const result = BlocksHelper.AlreadyReceivedThisBlock(initialState, block);

      expect(result).toEqual(false);
      done();
    });

    it('AlreadyReceivedThisBlock() - returns true if block was already received', done => {
      let state = StateHelper.getInitialState();
      const block = createRandomBlock();
      state = BlocksHelper.MarkBlockAsReceived(state, block);

      const result = BlocksHelper.AlreadyReceivedThisBlock(state, block);

      expect(result).toEqual(true);
      done();
    });

    it('MarkBlockAsReceived() - returns new object reference', done => {
      const first = StateHelper.getInitialState();
      const block = createRandomBlock();

      const second = BlocksHelper.MarkBlockAsReceived(first, block);

      expect(first).not.toBe(second);
      done();
    });

    it('MarkBlockAsReceived() - sets block in cache', done => {
      const state = StateHelper.getInitialState();
      const block = createRandomBlock();

      const result = BlocksHelper.MarkBlockAsReceived(state, block);

      expect(result.blockCache[block.id]).toEqual(true);
      done();
    });

    it('ReceivedBlockIsInRightOrder() - returns false if height is not in order', done => {
      const state = StateHelper.getInitialState();
      state.lastBlock = loadGenesisBlock();

      const block = createRandomBlock(String(2)); // block should normally be height 1
      expect(block.height).toEqual(String(2));

      // act
      const result = BlocksHelper.ReceivedBlockIsInRightOrder(state, block);

      expect(result).toEqual(false);
      done();
    });

    it('ReceivedBlockIsInRightOrder() - returns false if prevBlockId is not the same', done => {
      const state = StateHelper.getInitialState();
      const genesisBlock = loadGenesisBlock();
      state.lastBlock = genesisBlock;

      const wrongPrevBlockId = randomHex(32);

      const block = createRandomBlock(String(1), wrongPrevBlockId); // correct height, but wrong prevBlockId
      expect(block.height).toEqual(String(1));

      // act
      const result = BlocksHelper.ReceivedBlockIsInRightOrder(state, block);

      expect(result).toEqual(false);
      done();
    });

    it('ReceivedBlockIsInRightOrder() - returns true if height and prevBlockId are correct in correct order', done => {
      const state = StateHelper.getInitialState();
      const genesisBlock = loadGenesisBlock();
      state.lastBlock = genesisBlock;

      const block = createRandomBlock(String(1), genesisBlock.id); // correct height, correct prevBlockId
      expect(block.height).toEqual(String(1));

      // act
      const result = BlocksHelper.ReceivedBlockIsInRightOrder(state, block);

      expect(result).toEqual(true);
      done();
    });

    it('ReceivedBlockIsInRightOrder() - throws if state has no lastBlock (should never happen)', done => {
      const initialState = StateHelper.getInitialState();
      const block = createRandomBlock(); // is never used

      expect(initialState.lastBlock).toBeUndefined();

      expect(() => {
        BlocksHelper.ReceivedBlockIsInRightOrder(initialState, block);
      }).toThrow('ReceivedBlockIsInRightOrder - no state.lastBlock');

      done();
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if newBlockMessage is undefined', done => {
      const newBlockMessage: NewBlockMessage = undefined;
      const newBlock = createRandomBlock();

      const result = BlocksHelper.IsNewBlockMessageAndBlockTheSame(
        newBlockMessage,
        newBlock
      );

      expect(result).toEqual(false);
      done();
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if newBlockMessage is undefined', done => {
      const newBlockMessage: NewBlockMessage = {
        height: String(1),
        id: randomHex(32),
        prevBlockId: randomHex(32),
      };
      const newBlock: IBlock = undefined;

      const result = BlocksHelper.IsNewBlockMessageAndBlockTheSame(
        newBlockMessage,
        newBlock
      );

      expect(result).toEqual(false);
      done();
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns true if height, id and prevBlockId are the same', done => {
      const newBlock: IBlock = createRandomBlock(String(14));
      const newBlockMessage: NewBlockMessage = {
        height: newBlock.height,
        id: newBlock.id,
        prevBlockId: newBlock.prevBlockId,
      };

      const result = BlocksHelper.IsNewBlockMessageAndBlockTheSame(
        newBlockMessage,
        newBlock
      );

      expect(result).toEqual(true);
      done();
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if height is not the same', done => {
      const newBlock: IBlock = createRandomBlock(String(13));
      const newBlockMessage: NewBlockMessage = {
        height: String(12), // different
        id: newBlock.id,
        prevBlockId: newBlock.prevBlockId,
      };

      const result = BlocksHelper.IsNewBlockMessageAndBlockTheSame(
        newBlockMessage,
        newBlock
      );

      expect(result).toEqual(false);
      done();
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if id is not the same', done => {
      const newBlock: IBlock = createRandomBlock(String(13));
      const newBlockMessage: NewBlockMessage = {
        height: newBlock.height,
        id: randomHex(32), // different
        prevBlockId: newBlock.prevBlockId,
      };

      const result = BlocksHelper.IsNewBlockMessageAndBlockTheSame(
        newBlockMessage,
        newBlock
      );

      expect(result).toEqual(false);
      done();
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if prevBlockId is not the same', done => {
      const newBlock: IBlock = createRandomBlock(String(13));
      const newBlockMessage: NewBlockMessage = {
        height: newBlock.height,
        id: newBlock.id,
        prevBlockId: randomHex(32),
      };

      const result = BlocksHelper.IsNewBlockMessageAndBlockTheSame(
        newBlockMessage,
        newBlock
      );

      expect(result).toEqual(false);
      done();
    });

    it.skip('AreAnyTransactionsAlreadyInDbIO()', done => {
      done();
    });

    it.skip('IsBlockAlreadyInDbIO()', done => {
      done();
    });

    it('setPreGenesisBlock() - returns lastBlock with height MINUS 1', done => {
      const initialState = StateHelper.getInitialState();

      const result = BlocksHelper.setPreGenesisBlock(initialState);

      expect(result.lastBlock).toEqual({
        height: String(-1),
      });
      done();
    });

    it('setPreGenesisBlock() - returns other object reference', done => {
      const initialState = StateHelper.getInitialState();

      const result = BlocksHelper.setPreGenesisBlock(initialState);

      expect(result).not.toBe(initialState);
      done();
    });

    it('SetLastBlock() - sets last block', done => {
      const initialState = StateHelper.getInitialState();

      const blockId = randomHex(32);
      const block = createRandomBlock(String(1), blockId);

      const result = BlocksHelper.SetLastBlock(initialState, block);

      expect(result.lastBlock).toEqual(block);
      done();
    });

    it('SetLastBlock() - returns other object', done => {
      const initialState = StateHelper.getInitialState();

      const blockId = randomHex(32);
      const block = createRandomBlock(String(1), blockId);

      const result = BlocksHelper.SetLastBlock(initialState, block);

      expect(result).not.toBe(initialState);
      done();
    });

    it('ProcessBlockCleanup() - clears processingBlock state fields', done => {
      let state = StateHelper.getInitialState();
      state = ConsensusHelper.CollectingVotes(state);
      state = BlocksHelper.MarkProposeAsReceived(state, {
        id: 'blockId',
      } as BlockPropose);
      state = BlocksHelper.MarkBlockAsReceived(state, {
        id: 'blockId',
      } as IBlock);
      state.lastVoteTime = 35235234;

      // check before
      expect(Object.keys(state.blockCache).length).toEqual(1);
      expect(Object.keys(state.proposeCache).length).toEqual(1);
      expect(state.lastVoteTime).toEqual(35235234);
      expect(state.privIsCollectingVotes).toEqual(true);

      // act
      const result = BlocksHelper.ProcessBlockCleanup(state);

      expect(result).toHaveProperty('blockCache', {});
      expect(result).toHaveProperty('proposeCache', {});
      expect(result).toHaveProperty('lastVoteTime', null);
      expect(result).toHaveProperty('privIsCollectingVotes', false);

      // returns other object reference
      expect(result).not.toBe(state);

      done();
    });

    it('SetLastPropose() - sets lastVoteTime and lastPropose', done => {
      const state = StateHelper.getInitialState();

      const lastVoteTime = Date.now();
      const propose: BlockPropose = {
        address: randomAddress(),
        generatorPublicKey: randomHex(32),
        height: String(3),
        timestamp: Date.now() - 20000,
        hash: randomHex(64),
        id: randomHex(32),
        signature: randomHex(32),
      };
      const result = BlocksHelper.SetLastPropose(state, lastVoteTime, propose);

      expect(result.lastVoteTime).toEqual(lastVoteTime);
      expect(result.lastPropose).toEqual(propose);

      // result should be other object reference
      expect(result).not.toBe(state);
      // propose should be other object refernce
      expect(result.lastPropose).not.toBe(propose);

      done();
    });

    it('IsBlockchainReady() - blockchain is not ready if lastSlot is 130 seconds ago', async done => {
      // preparation
      let state = StateHelper.getInitialState();
      const block = createRandomBlock(String(1));
      block.timestamp = slots.getEpochTime(undefined); // important
      state = BlocksHelper.SetLastBlock(state, block);

      const milliSeconds_130_SecondsAgo = Date.now() + 130 * 1000;

      // act
      const result = BlocksHelper.IsBlockchainReady(
        state,
        milliSeconds_130_SecondsAgo,
        dummyLogger
      );

      expect(result).toEqual(false);
      done();
    });

    it('IsBlockchainReady() - blockchain is ready if lastSlot is 100 seconds ago', async done => {
      // preparation
      let state = StateHelper.getInitialState();
      const block = createRandomBlock(String(1));
      block.timestamp = slots.getEpochTime(undefined); // important
      state = BlocksHelper.SetLastBlock(state, block);

      const milliSeconds_100_SecondsAgo = Date.now() + 100 * 1000;

      // act
      const result = BlocksHelper.IsBlockchainReady(
        state,
        milliSeconds_100_SecondsAgo,
        dummyLogger
      );

      expect(result).toEqual(true);
      done();
    });

    it('IsBlockchainReady() - blockchain is ready if lastSlot is 10 seconds ago', async done => {
      // preparation
      let state = StateHelper.getInitialState();
      const block = createRandomBlock(String(1));
      block.timestamp = slots.getEpochTime(undefined); // important
      state = BlocksHelper.SetLastBlock(state, block);

      const milliSeconds_10_SecondsAgo = Date.now() + 10 * 1000;

      // act
      const result = BlocksHelper.IsBlockchainReady(
        state,
        milliSeconds_10_SecondsAgo,
        dummyLogger
      );

      expect(result).toEqual(true);
      done();
    });

    it('verifyBlockSlot() - currentBlock and lastBlock having same timestamp makes check fail', done => {
      const lastBlock = createRandomBlock(String(1));
      const currentBlock = createRandomBlock(String(2));

      // important: lastBlock and currentBlock have the same SlotNumber
      const blockTimestamp = slots.getSlotTime(slots.getSlotNumber());
      lastBlock.timestamp = blockTimestamp;
      currentBlock.timestamp = blockTimestamp;

      let state = StateHelper.getInitialState();
      state = BlocksHelper.SetLastBlock(state, lastBlock);

      // act
      const result = BlocksHelper.verifyBlockSlot(
        state,
        Date.now(),
        currentBlock
      );

      expect(result).toEqual(false);
      done();
    });

    it('verifyBlockSlot() - lastBock timestamp greater then current block makes check fail', done => {
      const lastBlock = createRandomBlock(String(1));
      const currentBlock = createRandomBlock(String(2));

      // important: lastBlock has a greater slot number (which should not happen)
      const currentSlotNumber = slots.getSlotNumber();
      lastBlock.timestamp = slots.getSlotTime(currentSlotNumber + 1);
      currentBlock.timestamp = slots.getSlotTime(currentSlotNumber);

      let state = StateHelper.getInitialState();
      state = BlocksHelper.SetLastBlock(state, lastBlock);

      // act
      const result = BlocksHelper.verifyBlockSlot(
        state,
        Date.now(),
        currentBlock
      );

      expect(result).toEqual(false);

      done();
    });

    it('verifyBlockSlot() - currentBlock timestamp is too high for next slot makes check fail', done => {
      const lastBlock = createRandomBlock(String(1));
      const currentBlock = createRandomBlock(String(2));

      // important: currentBlock timestamp is too high for next slot
      const currentSlotNumber = slots.getSlotNumber();
      lastBlock.timestamp = slots.getSlotTime(currentSlotNumber);
      currentBlock.timestamp = slots.getSlotTime(currentSlotNumber + 2);

      let state = StateHelper.getInitialState();
      state = BlocksHelper.SetLastBlock(state, lastBlock);

      // act
      const result = BlocksHelper.verifyBlockSlot(
        state,
        Date.now(),
        currentBlock
      );

      expect(result).toEqual(false);

      done();
    });

    it('verifyBlockSlot() - currentBlock is in time and a slot higher then lastBlock makes check pass', done => {
      const lastBlock = createRandomBlock(String(1));
      const currentBlock = createRandomBlock(String(2));

      // important: current block is in time and a slot higher then lastBlock
      const currentSlotNumber = slots.getSlotNumber();
      lastBlock.timestamp = slots.getSlotTime(currentSlotNumber);
      currentBlock.timestamp = slots.getSlotTime(currentSlotNumber + 1);

      let state = StateHelper.getInitialState();
      state = BlocksHelper.SetLastBlock(state, lastBlock);

      // act
      const result = BlocksHelper.verifyBlockSlot(
        state,
        Date.now(),
        currentBlock
      );

      expect(result).toEqual(true);

      done();
    });
  });
});
