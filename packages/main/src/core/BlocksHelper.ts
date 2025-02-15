import {
  ITransaction,
  IBlock,
  BlockPropose,
  IConfig,
  UnconfirmedTransaction,
  IRound,
  KeyPair,
  ILogger,
  NewBlockMessage,
} from '@gnyio/interfaces';
import { ISimpleCache, IState } from '../globalInterfaces.js';
import { TransactionBase } from '@gnyio/base';
import { MAX_PAYLOAD_LENGTH } from '@gnyio/utils';
import * as crypto from 'crypto';
import { BlockReward } from '@gnyio/utils';
import { BlockBase } from '@gnyio/base';
import { ConsensusBase } from '@gnyio/base';
import { slots } from '@gnyio/utils';
import { copyObject } from '@gnyio/base';
import * as StateHelper from './StateHelper.js';
import BigNumber from 'bignumber.js';
import { Block } from '@gnyio/database-postgres';
import { Transaction } from '@gnyio/database-postgres';
import { RoundBase } from '@gnyio/base';

const blockReward = new BlockReward();

export function areTransactionsExceedingPayloadLength(
  transactions: Array<UnconfirmedTransaction | ITransaction>
) {
  let payloadLength = 0;

  for (const one of transactions) {
    const bytes = TransactionBase.getBytes(one);
    if (payloadLength + bytes.length > MAX_PAYLOAD_LENGTH) {
      return true;
    }
    payloadLength += bytes.length;
  }
  return false;
}

export function payloadHashOfAllTransactions(
  transactions: Array<UnconfirmedTransaction | ITransaction>
) {
  const payloadHash = crypto.createHash('sha256');

  for (const one of transactions) {
    const bytes = TransactionBase.getBytes(one);
    payloadHash.update(bytes);
  }
  return payloadHash.digest();
}

export function getFeesOfAll(
  transactions: Array<UnconfirmedTransaction | ITransaction>
) {
  return transactions.reduce(
    (prev: string, oneTrs: ITransaction) =>
      new BigNumber(prev).plus(oneTrs.fee || 0).toFixed(),
    String(0)
  );
}

export function generateBlockShort(
  keypair: KeyPair,
  timestamp: number,
  lastBlock: IBlock,
  unconfirmedTransactions: Array<UnconfirmedTransaction>
) {
  if (areTransactionsExceedingPayloadLength(unconfirmedTransactions)) {
    throw new Error('Playload length outof range');
  }

  const payloadHash = payloadHashOfAllTransactions(unconfirmedTransactions);
  const height = new BigNumber(lastBlock.height).plus(1).toFixed();
  const prevBlockId = lastBlock.id;
  const fees = getFeesOfAll(unconfirmedTransactions);
  const count = unconfirmedTransactions.length;
  const reward = blockReward.calculateReward(height);

  const transactions = unconfirmedTransactions.map(x =>
    TransactionBase.turnIntoFullTransaction(x, height)
  );
  const block: IBlock = {
    version: 0,
    delegate: keypair.publicKey.toString('hex'),
    height,
    prevBlockId,
    timestamp,
    transactions,
    count,
    fees: String(fees),
    payloadHash: payloadHash.toString('hex'),
    reward: String(reward),
    signature: null,
    id: null,
  };

  block.signature = BlockBase.sign(block, keypair);
  block.id = BlockBase.getId(block);

  return block;
}

export function AreTransactionsDuplicated(transactions: ITransaction[]) {
  const appliedTransactions: ISimpleCache<ITransaction> = {};
  for (const transaction of transactions) {
    if (appliedTransactions[transaction.id]) {
      return true;
    }
    appliedTransactions[transaction.id] = transaction;
  }
  return false;
}

export function CanAllTransactionsBeSerialized(transactions: ITransaction[]) {
  if (!transactions) throw new Error('transactions are null');
  for (const transaction of transactions) {
    try {
      const bytes = TransactionBase.getBytes(transaction);
    } catch (err) {
      return false;
    }
  }
  return true;
}

export function NotEnoughActiveKeyPairs(activeKeypairs: KeyPair[]) {
  return !Array.isArray(activeKeypairs) || activeKeypairs.length === 0;
}

export function ManageProposeCreation(
  keypair: KeyPair,
  block: IBlock,
  config: Partial<IConfig>
) {
  if (!config.publicIp || !config.peerPort) {
    throw new Error('config.publicIp and config.peerPort is mandatory');
  }

  const publicIp = config.publicIp;
  const peerPort = config.peerPort;

  const serverAddr = `${publicIp}:${peerPort}`;
  let propose: BlockPropose;
  try {
    propose = ConsensusBase.createPropose(keypair, block, serverAddr);
    return propose;
  } catch (e) {
    throw new Error('Failed to create propose');
  }
}

export async function IsBlockAlreadyInDbIO(block: IBlock) {
  // if (!new BigNumber(block.height).isEqualTo(0)) {
  const exists = await global.app.sdb.exists<Block>(Block, {
    id: block.id,
  });
  if (exists) throw new Error(`Block already exists: ${block.id}`);
  // }
}

export async function AreAnyTransactionsAlreadyInDbIO(
  transactions: ITransaction[]
) {
  const idList = transactions.map(t => t.id);

  if (
    idList.length !== 0 &&
    (await global.app.sdb.exists<Transaction>(Transaction, { id: idList }))
  ) {
    throw new Error('Block contain already confirmed transaction');
  }
}

export function DoesNewBlockProposeMatchOldOne(
  state: IState,
  propose: BlockPropose
) {
  const lastPropose = state.lastPropose;

  if (
    lastPropose &&
    lastPropose.height === propose.height &&
    lastPropose.generatorPublicKey === propose.generatorPublicKey &&
    lastPropose.id !== propose.id
  ) {
    return true;
  }

  return false;
}

export function AlreadyReceivedPropose(state: IState, propose: BlockPropose) {
  if (state.proposeCache[propose.hash]) return true;
  else return false;
}

export function MarkProposeAsReceived(old: IState, propose: BlockPropose) {
  const state = StateHelper.copyState(old);

  state.proposeCache[propose.hash] = true;
  return state;
}

export function ReceivedBlockIsInRightOrder(state: IState, block: IBlock) {
  if (!state.lastBlock) {
    throw new Error('ReceivedBlockIsInRightOrder - no state.lastBlock');
  }

  const inCorrectOrder =
    block.prevBlockId === state.lastBlock.id &&
    new BigNumber(state.lastBlock.height).plus(1).isEqualTo(block.height);
  if (inCorrectOrder) {
    return true;
  } else {
    return false;
  }
}

export function IsNewBlockMessageAndBlockTheSame(
  newBlockMsg: NewBlockMessage,
  block: IBlock
) {
  if (!newBlockMsg || !block) return false;

  if (
    newBlockMsg.height !== block.height ||
    newBlockMsg.id !== block.id ||
    newBlockMsg.prevBlockId !== block.prevBlockId
  ) {
    return false;
  } else {
    return true;
  }
}

export function DoesTheNewBlockFitInLine(
  state: IState,
  newBlock: Pick<IBlock, 'height' | 'id' | 'prevBlockId'>
) {
  const lastBlock = state.lastBlock;

  const lastBlockPlus1 = new BigNumber(lastBlock.height).plus(1).toFixed();
  if (
    new BigNumber(newBlock.height).isEqualTo(lastBlockPlus1) &&
    newBlock.prevBlockId === lastBlock.id
  ) {
    return true;
  }
  return false;
}

export function IsBlockchainReady(
  state: IState,
  currentMilliSeconds: number,
  logger: ILogger
) {
  const lastBlock = state.lastBlock;
  // get next slot from current from current milliseconds (Date.now())
  const nextSlot =
    slots.getSlotNumber(slots.getEpochTime(currentMilliSeconds)) + 1;
  const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
  if (nextSlot - lastSlot >= 12) {
    logger.warn(
      `Blockchain is not ready ${JSON.stringify(
        {
          getNextSlot: slots.getNextSlot(),
          lastSlot,
          lastBlockHeight: lastBlock.height,
        },
        null,
        2
      )}`
    );
    return false;
  }
  return true;
}

export function SetLastBlock(old: IState, block: IBlock) {
  const state = StateHelper.copyState(old);

  state.lastBlock = block; // copy block?
  return state;
}

export function ProcessBlockCleanup(old: IState) {
  const state = StateHelper.copyState(old);

  state.proposeCache = {};
  state.lastVoteTime = null;
  state.privIsCollectingVotes = false;

  return state;
}

export function setPreGenesisBlock(old: IState) {
  const state = StateHelper.copyState(old);

  state.lastBlock = {
    height: String(-1),
  } as IBlock;

  return state;
}

export function SetLastPropose(
  old: IState,
  lastVoteTime: number,
  oldPropose: BlockPropose
) {
  const state = StateHelper.copyState(old);
  const propose = copyObject(oldPropose);

  state.lastVoteTime = lastVoteTime;
  state.lastPropose = propose;

  return state;
}

export function verifyBlockSlot(
  state: IState,
  currentMilliSeconds: number,
  block: IBlock
) {
  const blockSlotNumber = slots.getSlotNumber(block.timestamp);
  const lastBlockSlotNumber = slots.getSlotNumber(state.lastBlock.timestamp);

  const currentEpochTime = slots.getEpochTime(currentMilliSeconds);
  const nextSlotNumber = slots.getSlotNumber(currentEpochTime) + 1;

  if (blockSlotNumber > nextSlotNumber) {
    return false;
  }
  if (blockSlotNumber <= lastBlockSlotNumber) {
    return false;
  }
  return true;
}

export function differenceBetween2Sets(setA: Set<string>, setB: Set<string>) {
  const _difference = new Set<string>(setA);
  for (const elem of setB) {
    _difference.delete(elem);
  }
  return _difference;
}

/**
 * Pass in the last 101 blocks at the end of the round
 * The last block must be a manifold of 101
 *
 * The fees for the blocks get divided by 101 and the last block gets the remainding
 * Every delegate that produced a block gets the full reward (no distribution)
 * The result is then grouped for each delegate
 */
export function getGroupedDelegateInfoFor101Blocks(
  blocks: Array<Partial<IBlock>>
) {
  if (!blocks || blocks.length !== 101) {
    throw new Error('wrong amount of blocks');
  }
  const lastBlock = blocks[blocks.length - 1];
  if (!new BigNumber(lastBlock.height).modulo(101).isEqualTo(0)) {
    throw new Error('modulo not correct');
  }

  const feesSum = blocks
    .map(x => x.fees)
    .reduce((acc, curr) => new BigNumber(acc).plus(curr).toFixed());

  const oneFee = new BigNumber(feesSum).dividedToIntegerBy(101).toFixed();

  const equalDistributedFee = new BigNumber(oneFee).times(101).toFixed();
  const remainer = new BigNumber(feesSum).minus(equalDistributedFee).toFixed();

  interface IResult {
    delegate: string;
    fee: string;
  }

  const result: Array<IResult> = [];
  for (let i = 0; i < blocks.length; ++i) {
    const one = blocks[i];

    const r = {
      delegate: one.delegate,
      fee: oneFee,
    };
    result.push(r);
  }
  const lastResult = result[result.length - 1];
  lastResult.fee = new BigNumber(lastResult.fee).plus(remainer).toFixed();

  const grouped = {};
  for (let i = 0; i < result.length; ++i) {
    const b = blocks[i];
    const r = result[i];
    if (!grouped[r.delegate]) {
      grouped[r.delegate] = {
        fee: String(0),
        reward: String(0),
        producedBlocks: 0,
      };
    }

    const calculatedFee = new BigNumber(grouped[r.delegate].fee)
      .plus(r.fee)
      .toFixed();
    const calculatedReward = new BigNumber(grouped[r.delegate].reward)
      .plus(b.reward)
      .toFixed();
    const producedBlocks = grouped[r.delegate].producedBlocks + 1;

    grouped[r.delegate] = {
      fee: calculatedFee,
      reward: calculatedReward,
      producedBlocks,
    };
  }

  return grouped;
}

export function getRoundInfoForBlocks(blocks: Array<Partial<IBlock>>) {
  if (!blocks || blocks.length !== 101) {
    throw new Error('wrong amount of blocks');
  }

  const lastBlock = blocks[blocks.length - 1];
  if (!new BigNumber(lastBlock.height).modulo(101).isEqualTo(0)) {
    throw new Error('modulo not correct');
  }

  const roundNr = RoundBase.calculateRound(lastBlock.height);

  const fees = blocks
    .map(x => x.fees)
    .reduce((acc, current) => new BigNumber(current).plus(acc).toFixed());
  const rewards = blocks
    .map(x => x.reward)
    .reduce((acc, current) => new BigNumber(current).plus(acc).toFixed());

  const round: IRound = {
    round: String(roundNr),
    fee: fees,
    reward: rewards,
  };
  return round;
}

export function delegatesWhoMissedBlock(
  blocks: Array<Partial<IBlock>>,
  delegatesInThisRound: string[]
) {
  const forgedDelegates = new Set(blocks.map(x => x.delegate));

  const delegatesWhoMissedBlocks = [];
  for (let i = 0; i < delegatesInThisRound.length; ++i) {
    const one = delegatesInThisRound[i];
    if (!forgedDelegates.has(one)) {
      delegatesWhoMissedBlocks.push(one);
    }
  }

  return delegatesWhoMissedBlocks;
}
