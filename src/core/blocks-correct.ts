import {
  Transaction,
  KeyPair,
  IBlock,
  BlockPropose,
  IState,
  ISimpleCache,
  IConfig,
  NewBlockMessage,
  ILogger,
  PeerNode,
} from '../interfaces';
import { TransactionBase } from '../base/transaction';
import { MAX_PAYLOAD_LENGTH } from '../utils/constants';
import * as crypto from 'crypto';
import Blockreward from '../utils/block-reward';
import { BlockBase } from '../base/block';
import { ConsensusBase } from '../base/consensus';
import joi from '../../src/utils/extendedJoi';
import slots from '../utils/slots';

const blockreward = new Blockreward();

export enum BlockMessageFitInLineResult {
  Success = 0,
  Exit = 1,
  SyncBlocks = 2,
}

export class BlocksCorrect {
  public static setState(state: IState) {
    global.state = state;
  }
  /**
   * Warning: The object reference returned from this function should never get changed,
   * always make a copy first
   */
  public static getState() {
    return global.state;
  }

  public static areTransactionsExceedingPayloadLength(
    transactions: Transaction[]
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

  public static payloadHashOfAllTransactions(transactions: Transaction[]) {
    const payloadHash = crypto.createHash('sha256');

    for (const one of transactions) {
      const bytes = TransactionBase.getBytes(one);
      payloadHash.update(bytes);
    }
    return payloadHash.digest();
  }

  public static getFeesOfAll(transactions: Transaction[]) {
    return transactions.reduce(
      (prev: number, oneTrs: Transaction) => prev + (oneTrs.fee || 0),
      0
    );
  }

  public static generateBlockShort(
    keypair: KeyPair,
    timestamp: number,
    lastBlock: IBlock,
    unconfirmedTransactions: Transaction[]
  ) {
    if (
      BlocksCorrect.areTransactionsExceedingPayloadLength(
        unconfirmedTransactions
      )
    ) {
      throw new Error('Playload length outof range');
    }

    const payloadHash = BlocksCorrect.payloadHashOfAllTransactions(
      unconfirmedTransactions
    );
    const height = lastBlock.height + 1;
    const prevBlockId = lastBlock.id;
    const fees = BlocksCorrect.getFeesOfAll(unconfirmedTransactions);
    const count = unconfirmedTransactions.length;
    const reward = blockreward.calculateReward(height);

    const block: IBlock = {
      version: 0,
      delegate: keypair.publicKey.toString('hex'),
      height,
      prevBlockId,
      timestamp,
      transactions: unconfirmedTransactions,
      count,
      fees,
      payloadHash: payloadHash.toString('hex'),
      reward,
      signature: null,
      id: null,
    };

    block.signature = BlockBase.sign(block, keypair);
    block.id = BlockBase.getId(block);

    return block;
  }

  public static AreTransactionsDuplicated(transactions: Transaction[]) {
    const appliedTransactions: ISimpleCache<Transaction> = {};
    for (const transaction of transactions) {
      if (appliedTransactions[transaction.id]) {
        return true;
      }
      appliedTransactions[transaction.id] = transaction;
    }
    return false;
  }

  public static CanAllTransactionsBeSerialized(transactions: Transaction[]) {
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

  public static NotEnoughActiveKeyPairs(activeKeypairs: KeyPair[]) {
    return !Array.isArray(activeKeypairs) || activeKeypairs.length === 0;
  }

  public static ManageProposeCreation(
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

  public static async IsBlockAlreadyInDbIO(block: IBlock) {
    if (block.height !== 0) {
      const exists = await global.app.sdb.exists('Block', { id: block.id });
      if (exists) throw new Error(`Block already exists: ${block.id}`);
    }
  }

  public static async AreAnyTransactionsAlreadyInDbIO(
    transactions: Transaction[]
  ) {
    const idList = transactions.map(t => t.id);

    if (
      idList.length !== 0 &&
      (await global.app.sdb.exists('Transaction', { id: idList }))
    ) {
      throw new Error('Block contain already confirmed transaction');
    }
  }

  public static DoesNewBlockProposeMatchOldOne(
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

  public static AlreadyReceivedPropose(state: IState, propose: BlockPropose) {
    if (state.proposeCache[propose.hash]) return true;
    else return false;
  }

  public static MarkProposeAsReceived(state: IState, propose: BlockPropose) {
    state.proposeCache[propose.hash] = true;
    return state;
  }

  public static AlreadyReceivedThisBlock(state: IState, block: IBlock) {
    if (state.blockCache[block.id]) return true;
    else return false;
  }
  public static MarkBlockAsReceived(state: IState, block: IBlock) {
    state.blockCache[block.id] = true;
    return state;
  }

  public static ReceivedBlockIsInRightOrder(state: IState, block: IBlock) {
    const inCorrectOrder =
      block.prevBlockId === state.lastBlock.id &&
      state.lastBlock.height + 1 === block.height;
    if (inCorrectOrder) return true;
    else return false;
  }

  public static IsBlockPropose(propose: any): propose is BlockPropose {
    const schema = joi.object().keys({
      address: joi
        .string()
        .ipv4PlusPort()
        .required(),
      generatorPublicKey: joi
        .string()
        .hex()
        .required(),
      hash: joi
        .string()
        .hex()
        .required(),
      height: joi
        .number()
        .integer()
        .positive()
        .required(),
      id: joi
        .string()
        .hex()
        .required(),
      signature: joi
        .string()
        .hex()
        .required(),
      timestamp: joi
        .number()
        .integer()
        .positive()
        .required(),
    });
    const report = joi.validate(propose, schema);
    if (report.error) {
      return false;
    }
    return true;
  }

  public static IsNewBlockMessage(body: any): body is NewBlockMessage {
    const schema = joi.object({
      id: joi
        .string()
        .hex()
        .required(),
      height: joi
        .number()
        .integer()
        .positive()
        .required(),
      prevBlockId: joi
        .string()
        .hex()
        .required(),
    });
    const report = joi.validate(body, schema);
    if (report.error) {
      return false;
    }

    return true;
  }

  public static IsNewBlockMessageAndBlockTheSame(
    newBlockMsg: NewBlockMessage,
    block: IBlock
  ): any {
    if (!newBlockMsg || !block) return false;

    if (
      newBlockMsg.height !== block.height ||
      newBlockMsg.id !== block.id ||
      newBlockMsg.prevBlockId !== block.prevBlockId
    )
      return false;
    else return true;
  }

  public static DoesTheNewBlockMessageFitInLine(
    state: IState,
    newBlockMsg: NewBlockMessage
  ) {
    const lastBlock = state.lastBlock;

    // TODO: compare to other "fitInLine" comparisons?! Aren't they equal?
    if (
      newBlockMsg.height !== Number(lastBlock.height) + 1 ||
      newBlockMsg.prevBlockId !== lastBlock.id
    ) {
      if (newBlockMsg.height > Number(lastBlock.height) + 5) {
      } else {
        return BlockMessageFitInLineResult.SyncBlocks;
      }
      return BlockMessageFitInLineResult.Exit;
    }
    return BlockMessageFitInLineResult.Success;
  }

  public static IsBlockchainReady(state: IState, logger: ILogger) {
    const lastBlock = state.lastBlock;
    const nextSlot = slots.getNextSlot();
    const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
    if (nextSlot - lastSlot >= 12) {
      logger.warn('Blockchain is not ready', {
        getNextSlot: slots.getNextSlot(),
        lastSlot,
        lastBlockHeight: lastBlock.height,
      });
      return false;
    }
    return true;
  }

  public static IsPeerNode(peer: any): peer is PeerNode {
    const peerSchema = joi.object().keys({
      host: joi
        .string()
        .ip()
        .required(),
      port: joi
        .number()
        .port()
        .required(),
    });
    const peerReport = joi.validate(peer, peerSchema);
    if (peerReport.error) {
      return false;
    }
    return true;
  }

  public static SetLastBlockEffect(state: IState, block: IBlock) {
    state.lastBlock = block; // TODO: first make state copy
    return state;
  }
}
