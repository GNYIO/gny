import { BlocksHelper } from '@gny/main/blockshelper';
import {
  ITransaction,
  IConfig,
  IBlock,
  KeyPair,
  BlockPropose,
  NewBlockMessage,
} from '@gny/interfaces';
import * as crypto from 'crypto';
import { generateAddress } from '@gny/utils';
import * as ed from '@gny/ed';
import { ConsensusHelper } from '@gny/main/consensushelper';
import { slots } from '@gny/utils';
import { StateHelper } from '@gny/main/statehelper';
import { BigNumber } from 'bignumber.js';
import { getConfig } from '@gny/network';

const dummyLogger = {
  log: x => x,
  trace: x => x,
  debug: x => x,
  info: x => x,
  warn: x => x,
  error: x => x,
  fatal: x => x,
};

function range(start, end): Array<Number> {
  const result = [];
  for (let i = start; i <= end; ++i) {
    result.push(i);
  }
  return result;
}

function createDelegateBlocks(
  start: number,
  end: number,
  delegate: string,
  fees: string = String(0.1 * 1e8),
  reward: string = String(3 * 1e8)
) {
  const blocks: Array<Partial<IBlock>> = range(start, end).map(x => ({
    height: String(x),
    delegate,
    fees,
    reward,
  }));
  return blocks;
}

function loadGenesisBlock() {
  return getConfig('localnet').genesisBlock;
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
    it('AreTransactionsDuplicated() - returns false if no transaction-ID is duplicated', () => {
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
    });

    it('AreTransactionsDuplicated() - returns true if transaction-IDs are duplicated', () => {
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
    });

    it('CanAllTransactionsBeSerialized() - returns true if for all transaction getBytes() can be called', () => {
      const transactions = [
        createRandomTransaction(),
        createRandomTransaction(),
        createRandomTransaction(),
      ];

      const result = BlocksHelper.CanAllTransactionsBeSerialized(transactions);
      expect(result).toEqual(true);
    });

    it('CanAllTransactionsBeSerialized() - returns false if for any transaction getBytes can not be called', () => {
      const correctTrs = createRandomTransaction();
      const wrongTrs = createRandomTransaction();
      delete wrongTrs.timestamp;

      const transactions = [correctTrs, wrongTrs];
      const result = BlocksHelper.CanAllTransactionsBeSerialized(transactions);
      expect(result).toEqual(false);
    });

    it('CanAllTransactionsBeSerialized() - returns true if empty transactions array is passed in', () => {
      const transactions = [];

      const result = BlocksHelper.CanAllTransactionsBeSerialized(transactions);
      expect(result).toEqual(true);
    });

    it('CanAllTransactionsBeSerialized() - throws if no transactions array is passed in', () => {
      const transactions = null;

      expect(() =>
        BlocksHelper.CanAllTransactionsBeSerialized(transactions)
      ).toThrow('transactions are null');
    });

    it.skip('ManageProposeCreation() - create propose', () => {
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
    });

    it('NotEnoughActiveKeyPairs() - returns false if one KeyPair is provided', () => {
      const keypairs = [randomKeyPair()];

      const result = BlocksHelper.NotEnoughActiveKeyPairs(keypairs);
      expect(result).toEqual(false);
    });

    it('NotEnoughActiveKeyPairs() - returns true if empty array is provided', () => {
      const keypairs = [];

      const result = BlocksHelper.NotEnoughActiveKeyPairs(keypairs);
      expect(result).toEqual(true);
    });

    it('NotEnoughActiveKeyPairs() - returns true if null value is provided', () => {
      const keypairs = null;

      const result = BlocksHelper.NotEnoughActiveKeyPairs(keypairs);
      expect(result).toEqual(true);
    });

    it('generateBlockShort() - generates block', () => {
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
    });

    it(
      'areTransactionsExceedingPayloadLength() - returns true if bytes of all transaction exceeding threshold',
      () => {
        const transactions: ITransaction[] = [];

        for (let i = 0; i < 180000; ++i) {
          const x = createRandomTransaction();
          transactions.push(x);
        }

        const result = BlocksHelper.areTransactionsExceedingPayloadLength(
          transactions
        );
        expect(result).toEqual(true);
      },
      20 * 1000
    );

    it('areTransactionsExceedingPayloadLength() - returns false if bytes of all transaction are not exceeding threshold', () => {
      const transactions: ITransaction[] = [];

      for (let i = 0; i < 999; ++i) {
        const x = createRandomTransaction();
        transactions.push(x);
      }

      const result = BlocksHelper.areTransactionsExceedingPayloadLength(
        transactions
      );
      expect(result).toEqual(false);
    });

    it('getFeesOfAll() - get fees of all transactions', () => {
      const trs1 = createRandomTransaction();
      const trs2 = createRandomTransaction();
      const trs3 = createRandomTransaction();

      expect(trs1.fee).toEqual(String(0.1 * 1e8));
      expect(trs2.fee).toEqual(String(0.1 * 1e8));
      expect(trs3.fee).toEqual(String(0.1 * 1e8));

      const transactions = [trs1, trs2, trs3];

      const fees = BlocksHelper.getFeesOfAll(transactions);
      expect(fees).toEqual(String(0.3 * 1e8));
    });

    it('getFeesOfAll() - sums over all transaction fees, also when they are not provided', () => {
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
    });

    it('payloadHashOfAllTransactions() - returns hash of all transactions', () => {
      const transactions = [
        createRandomTransaction(),
        createRandomTransaction(),
      ];

      const hash = BlocksHelper.payloadHashOfAllTransactions(transactions);
      expect(Buffer.isBuffer(hash)).toEqual(true);

      const hex = hash.toString('hex');
      expect(typeof hex).toEqual('string');
      expect(hex).toHaveLength(64);
    });

    it('payloadHashOfAllTransactions() - works for empty transactions array', () => {
      const transactions: ITransaction[] = [];

      const hash = BlocksHelper.payloadHashOfAllTransactions(transactions);
      expect(Buffer.isBuffer(hash)).toEqual(true);

      const hex = hash.toString('hex');
      expect(typeof hex).toEqual('string');
      expect(hex).toHaveLength(64);
    });

    it('DoesNewBlockProposeMatchOldOne() - returns true if height, generatorPublicKey', () => {
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
    });

    it('DoesNewBlockProposeMatchOldOne() - returns false if lastPropose does not exists', () => {
      // preparation
      const initialState = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(2));

      // act
      const result = BlocksHelper.DoesNewBlockProposeMatchOldOne(
        initialState,
        propose
      );

      expect(result).toEqual(false);
    });

    it('DoesNewBlockProposeMatchOldOne() - returns false if height does not match', () => {
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
    });

    it('DoesNewBlockProposeMatchOldOne() - returns false if generatorPublicKey does not match', () => {
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
    });

    it('AlreadyReceivedPropose() - returns false when ProposeCache is empty', () => {
      const state = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(10));

      const result = BlocksHelper.AlreadyReceivedPropose(state, propose);

      expect(result).toEqual(false);
    });

    it('AlreadyReceivedPropose() - returns true when Propose hash was already received', () => {
      // preparation
      const propose = createRandomBlockPropose(String(10));

      let state = StateHelper.getInitialState();
      state = BlocksHelper.MarkProposeAsReceived(state, propose);

      // act
      const result = BlocksHelper.AlreadyReceivedPropose(state, propose);

      expect(result).toEqual(true);
    });

    it('MarkProposeAsReceived() - returns new object reference', () => {
      const initialState = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(10));

      const updatedState = BlocksHelper.MarkProposeAsReceived(
        initialState,
        propose
      );

      expect(initialState).not.toBe(updatedState);
    });

    it('MarkProposeAsReceived() - marks propose as received', () => {
      const initialState = StateHelper.getInitialState();
      const propose = createRandomBlockPropose(String(10));

      const updatedState = BlocksHelper.MarkProposeAsReceived(
        initialState,
        propose
      );

      expect(updatedState.proposeCache[propose.hash]).toEqual(true);
    });

    it('ReceivedBlockIsInRightOrder() - returns false if height is not in order', () => {
      const state = StateHelper.getInitialState();
      // @ts-ignore
      state.lastBlock = loadGenesisBlock();

      const block = createRandomBlock(String(2)); // block should normally be height 1
      expect(block.height).toEqual(String(2));

      // act
      const result = BlocksHelper.ReceivedBlockIsInRightOrder(state, block);

      expect(result).toEqual(false);
    });

    it('ReceivedBlockIsInRightOrder() - returns false if prevBlockId is not the same', () => {
      const state = StateHelper.getInitialState();
      const genesisBlock = loadGenesisBlock();
      // @ts-ignore
      state.lastBlock = genesisBlock;

      const wrongPrevBlockId = randomHex(32);

      const block = createRandomBlock(String(1), wrongPrevBlockId); // correct height, but wrong prevBlockId
      expect(block.height).toEqual(String(1));

      // act
      const result = BlocksHelper.ReceivedBlockIsInRightOrder(state, block);

      expect(result).toEqual(false);
    });

    it('ReceivedBlockIsInRightOrder() - returns true if height and prevBlockId are correct in correct order', () => {
      const state = StateHelper.getInitialState();
      const genesisBlock = loadGenesisBlock();
      // @ts-ignore
      state.lastBlock = genesisBlock;

      // @ts-ignore
      const block = createRandomBlock(String(1), genesisBlock.id); // correct height, correct prevBlockId
      expect(block.height).toEqual(String(1));

      // act
      const result = BlocksHelper.ReceivedBlockIsInRightOrder(state, block);

      expect(result).toEqual(true);
    });

    it('ReceivedBlockIsInRightOrder() - throws if state has no lastBlock (should never happen)', () => {
      const initialState = StateHelper.getInitialState();
      const block = createRandomBlock(); // is never used

      expect(initialState.lastBlock).toBeUndefined();

      expect(() => {
        BlocksHelper.ReceivedBlockIsInRightOrder(initialState, block);
      }).toThrow('ReceivedBlockIsInRightOrder - no state.lastBlock');
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if newBlockMessage is undefined', () => {
      const newBlockMessage: NewBlockMessage = undefined;
      const newBlock = createRandomBlock();

      const result = BlocksHelper.IsNewBlockMessageAndBlockTheSame(
        newBlockMessage,
        newBlock
      );

      expect(result).toEqual(false);
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if newBlockMessage is undefined', () => {
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
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns true if height, id and prevBlockId are the same', () => {
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
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if height is not the same', () => {
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
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if id is not the same', () => {
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
    });

    it('IsNewBlockMessageAndBlockTheSame() - returns false if prevBlockId is not the same', () => {
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
    });

    it.skip('AreAnyTransactionsAlreadyInDbIO()', () => {});

    it.skip('IsBlockAlreadyInDbIO()', () => {});

    it('setPreGenesisBlock() - returns lastBlock with height MINUS 1', () => {
      const initialState = StateHelper.getInitialState();

      const result = BlocksHelper.setPreGenesisBlock(initialState);

      expect(result.lastBlock).toEqual({
        height: String(-1),
      });
    });

    it('setPreGenesisBlock() - returns other object reference', () => {
      const initialState = StateHelper.getInitialState();

      const result = BlocksHelper.setPreGenesisBlock(initialState);

      expect(result).not.toBe(initialState);
    });

    it('SetLastBlock() - sets last block', () => {
      const initialState = StateHelper.getInitialState();

      const blockId = randomHex(32);
      const block = createRandomBlock(String(1), blockId);

      const result = BlocksHelper.SetLastBlock(initialState, block);

      expect(result.lastBlock).toEqual(block);
    });

    it('SetLastBlock() - returns other object', () => {
      const initialState = StateHelper.getInitialState();

      const blockId = randomHex(32);
      const block = createRandomBlock(String(1), blockId);

      const result = BlocksHelper.SetLastBlock(initialState, block);

      expect(result).not.toBe(initialState);
    });

    it('ProcessBlockCleanup() - clears processingBlock state fields', () => {
      let state = StateHelper.getInitialState();
      state = ConsensusHelper.CollectingVotes(state);
      state = BlocksHelper.MarkProposeAsReceived(state, {
        id: 'blockId',
      } as BlockPropose);
      state.lastVoteTime = 35235234;

      // check before
      expect(Object.keys(state.proposeCache).length).toEqual(1);
      expect(state.lastVoteTime).toEqual(35235234);
      expect(state.privIsCollectingVotes).toEqual(true);

      // act
      const result = BlocksHelper.ProcessBlockCleanup(state);

      expect(result).toHaveProperty('proposeCache', {});
      expect(result).toHaveProperty('lastVoteTime', null);
      expect(result).toHaveProperty('privIsCollectingVotes', false);

      // returns other object reference
      expect(result).not.toBe(state);
    });

    it('SetLastPropose() - sets lastVoteTime and lastPropose', () => {
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
    });

    it('IsBlockchainReady() - blockchain is not ready if lastSlot is 130 seconds ago', async () => {
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
    });

    it('IsBlockchainReady() - blockchain is ready if lastSlot is 100 seconds ago', async () => {
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
    });

    it('IsBlockchainReady() - blockchain is ready if lastSlot is 10 seconds ago', async () => {
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
    });

    it('verifyBlockSlot() - currentBlock and lastBlock having same timestamp makes check fail', () => {
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
    });

    it('verifyBlockSlot() - lastBock timestamp greater then current block makes check fail', () => {
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
    });

    it('verifyBlockSlot() - currentBlock timestamp is too high for next slot makes check fail', () => {
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
    });

    it('verifyBlockSlot() - currentBlock is in time and a slot higher then lastBlock makes check pass', () => {
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
    });

    it('getRoundInfoForBlocks - throws if null is passed in', () => {
      const blocks = undefined as Array<IBlock>;

      return expect(() =>
        BlocksHelper.getRoundInfoForBlocks(blocks)
      ).toThrowError('wrong amount of blocks');
    });

    it('getRoundInfoForBlocks - throws if not 101 blocks passed in', () => {
      const blocks: Array<IBlock> = [];

      return expect(() =>
        BlocksHelper.getRoundInfoForBlocks(blocks)
      ).toThrowError('wrong amount of blocks');
    });

    it('getRoundInfoForBlocks - throws if last block is not modulo 101 == 0', () => {
      // last block height is 100
      const blocks = [];
      for (let i = 0; i < 101; ++i) {
        const one: Partial<IBlock> = {
          height: String(i),
        };
        blocks.push(one);
      }

      return expect(() =>
        BlocksHelper.getRoundInfoForBlocks(blocks)
      ).toThrowError('modulo not correct');
    });

    it('getRoundInfoForBlocks - returns round 1', () => {
      const blocks = [];
      for (let i = 1; i < 102; ++i) {
        const one: Partial<IBlock> = {
          height: String(i),
          reward: String(3 * 1e8),
          fees: String(0.1 * 1e8),
        };
        blocks.push(one);
      }

      expect(blocks.length).toEqual(101);
      const result = BlocksHelper.getRoundInfoForBlocks(blocks);
      return expect(result.round).toEqual(String(1));
    });

    it('getRoundInfoForBlocks - return summed up fees', () => {
      const blocks = [];
      let feeSum = 0;
      for (let i = 102; i < 203; ++i) {
        // @ts-ignore
        const fees = (parseInt(Math.random() * 10) / 10) * 1e8;
        feeSum += fees;

        const one: Partial<IBlock> = {
          height: String(i),
          reward: String(2.5 * 1e8),
          fees: String(fees),
        };
        blocks.push(one);
      }

      const result = BlocksHelper.getRoundInfoForBlocks(blocks);
      expect(result.round).toEqual(String(2));
      return expect(result.fee).toEqual(String(feeSum));
    });

    it('getRoundInfoForBlocks - returned summed up rewards', () => {
      const blocks = [];

      for (let i = 203; i < 304; ++i) {
        const reward = String(3 * 1e8);
        const one: Partial<IBlock> = {
          height: String(i),
          reward: reward,
          fees: String(0.1 * 1e8),
        };
        blocks.push(one);
      }

      const result = BlocksHelper.getRoundInfoForBlocks(blocks);
      expect(result.round).toEqual(String(3));
      return expect(result.reward).toEqual(String(101 * 3 * 1e8));
    });

    it('getGroupedDelegateInfoFor101Blocks - if one delegate forged 101 blocks, it gets grouped', () => {
      const blocks: Array<Partial<IBlock>> = [];

      // all blocks got the same
      for (let i = 1; i < 102; ++i) {
        const one: Partial<IBlock> = {
          height: String(i),
          reward: String(3 * 1e8),
          fees: String(0.1 * 1e8),
          delegate:
            'b7a66054a061e5319eaa9fa7a86aca3df57e3f772eb4f8585042abd8246956b3',
        };
        blocks.push(one);
      }

      expect(blocks.length).toEqual(101);

      const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(blocks);
      return expect(result).toEqual({
        b7a66054a061e5319eaa9fa7a86aca3df57e3f772eb4f8585042abd8246956b3: {
          fee: String(0.1 * 1e8 * 101),
          reward: String(3 * 1e8 * 101),
          producedBlocks: 101,
        },
      });
    });

    it('getDelegateRewardsFor101Blocks - two delegates forge all 101 blocks', () => {
      const delegate1 =
        '1eaecdee15d162694fab942ee7da774c82c87dcf3473c83eb2c3cabda90897fe';
      const delegate2 =
        'd351ba5a2eca807eb8da6a069e8a5a39bf9b7c1522815d0e6d24505f2d0f7f4b';

      const range1 = range(1, 50).map(x => ({
        height: String(x),
        delegate: delegate1,
        reward: String(3 * 1e8),
        fees: String(0.1 * 1e8),
      }));

      const range2 = range(51, 101).map(x => ({
        height: String(x),
        delegate: delegate2,
        reward: String(2 * 1e8),
        fees: String(0),
      }));

      const blocks: Array<Partial<IBlock>> = [...range1, ...range2];

      const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(blocks);

      const feeSum = new BigNumber(result[delegate1].fee)
        .plus(result[delegate2].fee)
        .toFixed();
      expect(feeSum).toEqual(String(0.1 * 50 * 1e8));

      return expect(result).toEqual({
        '1eaecdee15d162694fab942ee7da774c82c87dcf3473c83eb2c3cabda90897fe': {
          fee: String(247524750),
          reward: String(50 * 3 * 1e8),
          producedBlocks: 50,
        },
        d351ba5a2eca807eb8da6a069e8a5a39bf9b7c1522815d0e6d24505f2d0f7f4b: {
          fee: '252475250',
          reward: String(51 * 2 * 1e8),
          producedBlocks: 51,
        },
      });
    });

    it('getDelegateRewardsFor101Blocks - no fee', () => {
      const range1 = range(1, 101).map(x => ({
        height: String(x),
        delegate:
          '48cc7a8fec22b0fcbef799d67f3fcce631b144a74983bdeb147487bcd20e0d0d',
        reward: String(3 * 1e8),
        fees: String(0),
      }));

      const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(range1);
      return expect(result).toEqual({
        '48cc7a8fec22b0fcbef799d67f3fcce631b144a74983bdeb147487bcd20e0d0d': {
          fee: String(0),
          reward: String(3 * 101 * 1e8),
          producedBlocks: 101,
        },
      });
    });

    it('getGroupedDelegateInfoFor101Blocks - no fee with 5 delegates', () => {
      const delegate1 =
        '94fddec969c55a67df77554fc27996549d650a040a398f4caffdab225a47d796';
      const delegate2 =
        '0a3f1a6665fe4b63d559045e3764b025706de0c655e6ca7e9a98946f34a8290e';
      const delegate3 =
        'f0019715e337581884a55295540d9a3e0f12c1e091b511e8e21e7b78ca58055e';
      const delegate4 =
        '4d57438ab55270d1901aba8372aa6901d38c0a062f820ff032a98354ad90fbef';
      const delegate5 =
        '68a61b3d45f58f2c22f82f911ea44ba3d62aeb2e04605d9fd0e7f758811d7c83';

      const zeroFee = String(0);
      const range1 = createDelegateBlocks(
        1,
        5,
        delegate1,
        zeroFee,
        String(3 * 1e8)
      );
      const range2 = createDelegateBlocks(
        6,
        20,
        delegate2,
        zeroFee,
        String(1.5 * 1e8)
      );
      const range3 = createDelegateBlocks(
        21,
        30,
        delegate3,
        zeroFee,
        String(1 * 1e8)
      );
      const range4 = createDelegateBlocks(
        31,
        80,
        delegate4,
        zeroFee,
        String(2 * 1e8)
      );
      const range5 = createDelegateBlocks(
        81,
        101,
        delegate5,
        zeroFee,
        String(1 * 1e8)
      );

      const blocks = [...range1, ...range2, ...range3, ...range4, ...range5];
      const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(blocks);

      return expect(result).toEqual({
        '94fddec969c55a67df77554fc27996549d650a040a398f4caffdab225a47d796': {
          fee: String(0),
          reward: String(5 * 3 * 1e8),
          producedBlocks: 5,
        },
        '0a3f1a6665fe4b63d559045e3764b025706de0c655e6ca7e9a98946f34a8290e': {
          fee: String(0),
          reward: String(15 * 1.5 * 1e8),
          producedBlocks: 15,
        },
        f0019715e337581884a55295540d9a3e0f12c1e091b511e8e21e7b78ca58055e: {
          fee: String(0),
          reward: String(10 * 1 * 1e8),
          producedBlocks: 10,
        },
        '4d57438ab55270d1901aba8372aa6901d38c0a062f820ff032a98354ad90fbef': {
          fee: String(0),
          reward: String(50 * 2 * 1e8),
          producedBlocks: 50,
        },
        '68a61b3d45f58f2c22f82f911ea44ba3d62aeb2e04605d9fd0e7f758811d7c83': {
          fee: String(0),
          reward: String(21 * 1 * 1e8),
          producedBlocks: 21,
        },
      });
    });

    it('getGroupedDelegateInfoFor101Blocks - no reward', () => {
      const range1 = range(1, 101).map(x => ({
        height: String(x),
        delegate:
          '588d735b15b747b410ce0645654c35aa7353994356915d5292c6c05213376710',
        reward: String(0),
        fees: String(0.1 * 1e8),
      }));

      const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(range1);
      return expect(result).toEqual({
        '588d735b15b747b410ce0645654c35aa7353994356915d5292c6c05213376710': {
          reward: String(0),
          fee: String(0.1 * 1e8 * 101),
          producedBlocks: 101,
        },
      });
    });

    it('getGroupedDelegateInfoFor101Blocks - 10 delegates, 9 have the same fee', () => {
      const delegate1 =
        '5139bf0aeedf7fa0730cd05d3b34657031c1ea693c377067c08d3c13ff5bbd73';
      const delegate2 =
        '7b2d474eab943559ce6e9bbbe2d71d7839bf8b05cc8c45d3a84413e8e7011a77';
      const delegate3 =
        'e123deb95501b06d5dc008a03f0dce7dbbef56ef7534eaba1dccc6df197a84f7';
      const delegate4 =
        '69b2caefed9925770e7e46a3538808630d9d75afbd22afae66c7b47fc6b9b92d';
      const delegate5 =
        'c40cc0b9bbebadc05d9d5a9a4e9584b57653e8b29d4f7672faebceb2db1c25c2';
      const delegate6 =
        '3f8c90a361fe0e9259de0fae27707caaabc86cef9b8d853ae046ef3d6f498d81';
      const delegate7 =
        '76d6f063e65324da07a257d0598fa7624339aad1ec19a2ff9ad27f7c0442f181';
      const delegate8 =
        '6c373fda3f8ee1f7e6537a0738d8142048918bd42278cc77a9dd4e689ea9cec5';
      const delegate9 =
        'ab2a41299c75636168ceeda2fbe9c6b65065560b749b205bc10ee7f1a366db85';
      const delegate10 =
        'e2e3703efc3b55ea7cc6052809cb12aaeb502c563b510fb7de8b41c67393ece1';

      const fees = String(0.1 * 1e8);
      const rewards = String(3 * 1e8);
      const range1 = createDelegateBlocks(1, 10, delegate1, fees, rewards);
      const range2 = createDelegateBlocks(11, 20, delegate2, fees, rewards);
      const range3 = createDelegateBlocks(21, 30, delegate3, fees, rewards);
      const range4 = createDelegateBlocks(31, 40, delegate4, fees, rewards);
      const range5 = createDelegateBlocks(41, 50, delegate5, fees, rewards);
      const range6 = createDelegateBlocks(51, 60, delegate6, fees, rewards);
      const range7 = createDelegateBlocks(61, 70, delegate7, fees, rewards);
      const range8 = createDelegateBlocks(71, 80, delegate8, fees, rewards);
      const range9 = createDelegateBlocks(81, 90, delegate9, fees, rewards);
      const range10 = createDelegateBlocks(91, 101, delegate10, fees, rewards);

      const blocks = [
        ...range1,
        ...range2,
        ...range3,
        ...range4,
        ...range5,
        ...range6,
        ...range7,
        ...range8,
        ...range9,
        ...range10,
      ];

      const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(blocks);

      const feeSum = Object.keys(result)
        .map(a => result[a].fee)
        .reduce((acc, curr) => new BigNumber(acc).plus(curr).toFixed());
      expect(feeSum).toEqual(
        new BigNumber(101)
          .times(0.1)
          .times(1e8)
          .toFixed()
      );

      const rewardSum = Object.keys(result)
        .map(a => result[a].reward)
        .reduce((acc, curr) => new BigNumber(acc).plus(curr).toFixed());
      expect(rewardSum).toEqual(
        new BigNumber(101)
          .times(3)
          .times(1e8)
          .toFixed()
      );

      // every delegate should have a fee of 1 (times 1e8)
      // the last delegate should have a fee of 1.1 (times 1e8)

      // every delegate should have a reward of 30 (times 1e8)
      // the last delegate should have a reward of 33 (times 1e8)
      return expect(result).toEqual({
        '5139bf0aeedf7fa0730cd05d3b34657031c1ea693c377067c08d3c13ff5bbd73': {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        '7b2d474eab943559ce6e9bbbe2d71d7839bf8b05cc8c45d3a84413e8e7011a77': {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        e123deb95501b06d5dc008a03f0dce7dbbef56ef7534eaba1dccc6df197a84f7: {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        '69b2caefed9925770e7e46a3538808630d9d75afbd22afae66c7b47fc6b9b92d': {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        c40cc0b9bbebadc05d9d5a9a4e9584b57653e8b29d4f7672faebceb2db1c25c2: {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        '3f8c90a361fe0e9259de0fae27707caaabc86cef9b8d853ae046ef3d6f498d81': {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        '76d6f063e65324da07a257d0598fa7624339aad1ec19a2ff9ad27f7c0442f181': {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        '6c373fda3f8ee1f7e6537a0738d8142048918bd42278cc77a9dd4e689ea9cec5': {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        ab2a41299c75636168ceeda2fbe9c6b65065560b749b205bc10ee7f1a366db85: {
          fee: String(1 * 1e8),
          reward: String(30 * 1e8),
          producedBlocks: 10,
        },
        e2e3703efc3b55ea7cc6052809cb12aaeb502c563b510fb7de8b41c67393ece1: {
          fee: String(new BigNumber(1.1).times(1e8)), // otherwise: 110000000.00000001
          reward: String(33 * 1e8),
          producedBlocks: 11,
        },
      });
    });

    it('getDelegateRewardsFor101Blocks - 0.1 fee', () => {
      const delegate1 =
        'c3bf53f4211abd1daa6f01d3bb79684c6d004fb91e24740cd22f4df2e87aa487';
      const delegate2 =
        'b770ff50da744b08e19d47930579bc8adaed3b1799bb5c473bb76e32a102c97b';
      const delegate3 =
        '3f7f6925256b89cdf6e39a4c0ee3342091529dc110a6aa66e778ffdef87f7139';

      const zeroFee = String(0);
      const smallFee = String(0.1 * 1e8); // important
      const oneReward = String(1 * 1e8);

      const range1 = createDelegateBlocks(1, 33, delegate1, zeroFee, oneReward);
      const range2 = createDelegateBlocks(
        34,
        67,
        delegate2,
        zeroFee,
        oneReward
      );
      const range3 = createDelegateBlocks(
        68,
        100,
        delegate3,
        zeroFee,
        oneReward
      );
      const range4 = createDelegateBlocks(
        101,
        101,
        delegate3,
        smallFee,
        oneReward
      ); // important

      const blocks = [...range1, ...range2, ...range3, ...range4];
      const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(blocks);

      // @ts-ignore
      const parts101 = parseInt((0.1 * 1e8) / 101);

      const feeSum = new BigNumber(result[delegate1].fee)
        .plus(result[delegate2].fee)
        .plus(result[delegate3].fee)
        .toFixed();
      expect(String(0.1 * 1e8)).toEqual(feeSum);

      // @ts-ignore
      const one101thOfTheFee = parseInt((0.1 * 1e8) / 101);
      const rest = 0.1 * 1e8 - one101thOfTheFee * 101;

      return expect(result).toEqual({
        c3bf53f4211abd1daa6f01d3bb79684c6d004fb91e24740cd22f4df2e87aa487: {
          fee: String(33 * one101thOfTheFee),
          reward: String(33 * 1 * 1e8),
          producedBlocks: 33,
        },
        b770ff50da744b08e19d47930579bc8adaed3b1799bb5c473bb76e32a102c97b: {
          fee: String(34 * one101thOfTheFee),
          reward: String(34 * 1 * 1e8),
          producedBlocks: 34,
        },
        '3f7f6925256b89cdf6e39a4c0ee3342091529dc110a6aa66e778ffdef87f7139': {
          fee: String(34 * one101thOfTheFee + rest),
          reward: String(34 * 1 * 1e8),
          producedBlocks: 34,
        },
      });
    });

    it('getDelegateRewardsFor101Blocks - 0.1 fee, 101 delegates', () => {
      // prepare
      const blocks: Array<Partial<IBlock>> = [];
      for (let i = 1; i < 102; ++i) {
        const del = crypto.randomBytes(32).toString('hex');

        const one = createDelegateBlocks(i, i, del, String(0), String(3 * 1e8));
        blocks.push(...one);
      }

      // add 0.1 (times 1e8) fees to first block
      const one = blocks[0];
      one.fees = String(0.1 * 1e8);

      // @ts-ignore
      const one101thOfTheFee = parseInt((0.1 * 1e8) / 101);
      const rest = 0.1 * 1e8 - one101thOfTheFee * 101;

      // expect
      const expected = {};
      for (let i = 0; i < blocks.length; ++i) {
        const one = blocks[i];
        expected[one.delegate] = {
          fee: String(one101thOfTheFee),
          reward: String(3 * 1e8),
          producedBlocks: 1,
        };
      }
      const lastBlockDelegate = blocks[blocks.length - 1].delegate;
      expected[lastBlockDelegate].fee = new BigNumber(
        expected[lastBlockDelegate].fee
      )
        .plus(rest)
        .toFixed();

      // act
      const result = BlocksHelper.getGroupedDelegateInfoFor101Blocks(blocks);
      return expect(result).toEqual(expected);
    });

    it('delegatesWhoMissedBlock() - returns two delegates that did not forged', () => {
      const delegate =
        '5139bf0aeedf7fa0730cd05d3b34657031c1ea693c377067c08d3c13ff5bbd73';
      const blocks = createDelegateBlocks(1, 101, delegate);

      const delegatesInThisRound = [
        '5139bf0aeedf7fa0730cd05d3b34657031c1ea693c377067c08d3c13ff5bbd73',
        '7b2d474eab943559ce6e9bbbe2d71d7839bf8b05cc8c45d3a84413e8e7011a77',
        'e123deb95501b06d5dc008a03f0dce7dbbef56ef7534eaba1dccc6df197a84f7',
      ];

      const result = BlocksHelper.delegatesWhoMissedBlock(
        blocks,
        delegatesInThisRound
      );

      expect(result).toEqual([
        '7b2d474eab943559ce6e9bbbe2d71d7839bf8b05cc8c45d3a84413e8e7011a77',
        'e123deb95501b06d5dc008a03f0dce7dbbef56ef7534eaba1dccc6df197a84f7',
      ]);
    });

    it('delegatesWhoMissedBlock() - when every delegate forged, returns empty array', () => {
      const delegate1 =
        '76d6f063e65324da07a257d0598fa7624339aad1ec19a2ff9ad27f7c0442f181';
      const block1 = createDelegateBlocks(1, 1, delegate1);
      const delegate2 =
        'ab2a41299c75636168ceeda2fbe9c6b65065560b749b205bc10ee7f1a366db85';
      const block2 = createDelegateBlocks(2, 2, delegate2);
      const delegate3 =
        'e2e3703efc3b55ea7cc6052809cb12aaeb502c563b510fb7de8b41c67393ece1';
      const block3 = createDelegateBlocks(3, 3, delegate3);

      const blocks = [...block1, ...block2, ...block3];

      const delegatesInThisRound = [
        '76d6f063e65324da07a257d0598fa7624339aad1ec19a2ff9ad27f7c0442f181',
        'ab2a41299c75636168ceeda2fbe9c6b65065560b749b205bc10ee7f1a366db85',
        'e2e3703efc3b55ea7cc6052809cb12aaeb502c563b510fb7de8b41c67393ece1',
      ];

      const result = BlocksHelper.delegatesWhoMissedBlock(
        blocks,
        delegatesInThisRound
      );
      return expect(result).toEqual([]);
    });

    it('delegatesWhoMissedBlock() - returns 5 delegates that did not forge', () => {
      const delegate1 =
        '44060ebf65a308a9acbeb12e0d27255f0d65e9fd8b10420bd2b9c1092f6ac48c';
      const delegate2 =
        'c3782459ff5265268717e3f43906d91b9acf9b90afdea2373441ec4e7f14bf44';
      const delegate3 =
        '63caa3a9c13e464a0483b5f770a039e1920807aae72d3bcbdf2d0edadfebe033';
      const delegate4 =
        '54004b14d562166bc91edfc27a1ed44a3527927610ed702be30183e315185df9';
      const delegate5 =
        '616fe44d53231c954f2aa0ce268136ca5412b4c7fbe3eb6165b7e44c44727a4c';
      const delegate6 =
        '998742f791ab5217c880d459b45be16b17f1a56b2abc5c4be8f71d89db815e54';
      const delegate7 =
        '4b7b941d3ea456d41813cf409d20e410ff747a9728c700089eff1d4a1053a196';
      const delegate8 =
        '8be208f621608ef7594616d038bde4cab9b6e63bf9745896d7fa5baac0c10263';
      const delegaet9 =
        'fbf93acfbcdd4d1bbf0891d1c68e9e4c64672a1a9284e8422981f6216f4922df';
      const delegate10 =
        '232c01e5d768f80569c33301b913e9a6b4fdca264a1ae3dbc8bd2e6080382a8f';

      const block1_20 = createDelegateBlocks(1, 20, delegate1);
      const block21_40 = createDelegateBlocks(21, 40, delegate2);
      const block41_60 = createDelegateBlocks(41, 60, delegate3);
      const block61_80 = createDelegateBlocks(61, 80, delegate4);
      const block81_101 = createDelegateBlocks(81, 101, delegate5);

      const blocks = [
        ...block1_20,
        ...block21_40,
        ...block41_60,
        ...block61_80,
        ...block81_101,
      ];

      const delegatesInThisRound = [
        '44060ebf65a308a9acbeb12e0d27255f0d65e9fd8b10420bd2b9c1092f6ac48c',
        'c3782459ff5265268717e3f43906d91b9acf9b90afdea2373441ec4e7f14bf44',
        '63caa3a9c13e464a0483b5f770a039e1920807aae72d3bcbdf2d0edadfebe033',
        '54004b14d562166bc91edfc27a1ed44a3527927610ed702be30183e315185df9',
        '616fe44d53231c954f2aa0ce268136ca5412b4c7fbe3eb6165b7e44c44727a4c',
        '998742f791ab5217c880d459b45be16b17f1a56b2abc5c4be8f71d89db815e54',
        '4b7b941d3ea456d41813cf409d20e410ff747a9728c700089eff1d4a1053a196',
        '8be208f621608ef7594616d038bde4cab9b6e63bf9745896d7fa5baac0c10263',
        'fbf93acfbcdd4d1bbf0891d1c68e9e4c64672a1a9284e8422981f6216f4922df',
        '232c01e5d768f80569c33301b913e9a6b4fdca264a1ae3dbc8bd2e6080382a8f',
      ];

      const result = BlocksHelper.delegatesWhoMissedBlock(
        blocks,
        delegatesInThisRound
      );
      return expect(result).toEqual([
        '998742f791ab5217c880d459b45be16b17f1a56b2abc5c4be8f71d89db815e54',
        '4b7b941d3ea456d41813cf409d20e410ff747a9728c700089eff1d4a1053a196',
        '8be208f621608ef7594616d038bde4cab9b6e63bf9745896d7fa5baac0c10263',
        'fbf93acfbcdd4d1bbf0891d1c68e9e4c64672a1a9284e8422981f6216f4922df',
        '232c01e5d768f80569c33301b913e9a6b4fdca264a1ae3dbc8bd2e6080382a8f',
      ]);
    });
  });
});
