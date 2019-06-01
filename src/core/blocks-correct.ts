import {
  Transaction,
  KeyPair,
  IBlock,
  BlockPropose,
  IState,
  ISimpleCache,
} from '../interfaces';
import { TransactionBase } from '../base/transaction';
import { maxPayloadLength } from '../utils/constants';
import * as crypto from 'crypto';
import Blockreward from '../utils/block-reward';
import { BlockBase } from '../base/block';
import { ConsensusBase } from '../base/consensus';

const blockreward = new Blockreward();

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
      if (payloadLength + bytes.length > maxPayloadLength) {
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

  public static ManageProposeCreation(keypair: KeyPair, block: IBlock) {
    const publicIp = global.Config.publicIp; // global access is bad
    const peerPort = global.Config.peerPort; // global access is bad

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

  public static async PrepareIODataForBlockGeneration(height: number) {
    let activeKeypairs: KeyPair[];
    try {
      activeKeypairs = await this.modules.delegates.getActiveDelegateKeypairs(
        height
      );
    } catch (e) {
      throw new Error(`Failed to get active delegate keypairs: ${e}`);
    }

    const io = {
      delegates,
    };

    // DB access
    // const exists = await global.app.sdb.exists('Block', { id: block.id });
    // (await global.app.sdb.exists('Transaction', { id: idList }))

    // const inMemory = {
    //   lastBlock: 0,
    //   config.publicIp and config.peerPort,
    //   }`;
    // };

    // SideEffects (when NOT enough votes):
    // this.library.modules.consensusManagement.setPendingBlock(block);
    // this.library.modules.consensusManagement.addPendingVotes(localVotes);
    // this.proposeCache[propose.hash] = true;
    // this.privIsCollectingVotes = true;
    // this.library.bus.message('onNewPropose', propose, true);

    // SideEffects (enough votes):
  }
}
