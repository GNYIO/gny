import * as _ from 'lodash';
import LRU = require('lru-cache');
import slots from '../utils/slots';
import {
  Modules,
  IScope,
  ManyVotes,
  PeerNode,
  NewBlockMessage,
  P2PMessage,
  BlockPropose,
  Transaction,
  IBlock,
  BlockAndVotes,
} from '../interfaces';
import { BlockBase } from '../base/block';
import { ConsensusBase } from '../base/consensus';
import { TransactionBase } from '../base/transaction';
import {
  isBlockPropose,
  isNewBlockMessage,
} from '../../packages/type-validation';

export default class Transport {
  private readonly library: IScope;
  public latestBlocksCache = new LRU<string, BlockAndVotes>(200);
  private blockHeaderMidCache = new LRU<string, NewBlockMessage>(1000);
  private modules: Modules;

  constructor(scope: IScope) {
    this.library = scope;
  }

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope;
  };

  // subscribe to peer events
  public onPeerReady = () => {
    this.modules.peer.p2p.subscribe(
      'newBlockHeader',
      this.receivePeer_NewBlockHeader
    );
    this.modules.peer.p2p.subscribe('propose', this.receivePeer_Propose);
    this.modules.peer.p2p.subscribe(
      'transaction',
      this.receivePeer_Transaction
    );
  };

  // broadcast to peers Transaction
  public onUnconfirmedTransaction = async (transaction: Transaction) => {
    const encodedTransaction = this.library.protobuf.encodeTransaction(
      transaction
    );
    await this.modules.peer.p2p.broadcastTransactionAsync(encodedTransaction);
  };

  // broadcast to peers NewBlockMessage
  public onNewBlock = async (block: IBlock, votes: ManyVotes) => {
    let blockAndVotes: BlockAndVotes = undefined;
    try {
      blockAndVotes = {
        block,
        votes: this.library.protobuf.encodeBlockVotes(votes).toString('base64'),
      };
    } catch (err) {
      this.library.logger.error('could not encode blockVotes');
      return;
    }

    this.latestBlocksCache.set(block.id, blockAndVotes);

    const message: NewBlockMessage =
      this.blockHeaderMidCache.get(block.id) ||
      ({
        id: block.id,
        height: block.height,
        prevBlockId: block.prevBlockId,
      } as NewBlockMessage);

    let encodedNewBlockMessage: Buffer;
    try {
      encodedNewBlockMessage = this.library.protobuf.encodeNewBlockMessage(
        message
      );
    } catch (err) {
      this.library.logger.warn(
        'could not encode NewBlockMessage with protobuf'
      );
      return;
    }
    await this.modules.peer.p2p.broadcastNewBlockHeaderAsync(
      encodedNewBlockMessage
    );
  };

  // broadcast to peers Propose
  public onNewPropose = async (propose: BlockPropose) => {
    let encodedBlockPropose: Buffer;
    try {
      encodedBlockPropose = this.library.protobuf.encodeBlockPropose(propose);
    } catch (err) {
      this.library.logger.warn('could not encode Propose with protobuf');
      return;
    }
    await this.modules.peer.p2p.broadcastProposeAsync(encodedBlockPropose);
  };

  // peerEvent
  private receivePeer_NewBlockHeader = async (message: P2PMessage) => {
    if (this.modules.loader.syncing()) {
      // TODO access state
      return;
    }

    let newBlockMsg;
    try {
      newBlockMsg = this.library.protobuf.decodeNewBlockMessage(message.data);
    } catch (err) {
      this.library.logger.warn(
        `could not decode NewBlockMessage with protobuf from ${message.from}`
      );
      return;
    }

    if (!isNewBlockMessage(newBlockMsg)) {
      return;
    }

    const peer = message.peerInfo;

    let result: BlockAndVotes;
    try {
      const params = { id: newBlockMsg.id };
      result = await this.modules.peer.request('newBlock', params, peer);
    } catch (err) {
      this.library.logger.error('Failed to get latest block data', err);
      return;
    }

    if (!result || !result.block || !result.votes) {
      this.library.logger.error('Invalid block data', result);
      return;
    }

    let block: IBlock;
    let votes: ManyVotes;
    try {
      block = result.block;
      votes = this.library.protobuf.decodeBlockVotes(
        Buffer.from(result.votes, 'base64')
      );
      block = BlockBase.normalizeBlock(block);
      votes = ConsensusBase.normalizeVotes(votes);

      this.latestBlocksCache.set(block.id, result); // TODO: make side effect more predictable
      this.blockHeaderMidCache.set(block.id, newBlockMsg); // TODO: make side effect more predictable
    } catch (e) {
      this.library.logger.error(
        `normalize block or votes object error: ${e.toString()}`,
        result
      );
    }

    this.library.bus.message(
      'onReceiveBlock',
      newBlockMsg,
      message.peerInfo,
      block,
      votes
    );
  };

  // peerEvent
  private receivePeer_Propose = (message: P2PMessage) => {
    let propose: BlockPropose;
    try {
      propose = this.library.protobuf.decodeBlockPropose(message.data);
    } catch (e) {
      this.library.logger.warn(
        `could not decode Propose with protobuf from ${message.from}`
      );
      return;
    }

    if (!isBlockPropose(propose)) {
      this.library.logger.warn('block propose validation did not work');
      return;
    }

    this.library.bus.message('onReceivePropose', propose);
  };

  // peerEvent
  public receivePeer_Transaction = (message: P2PMessage) => {
    let transaction: Transaction;
    try {
      transaction = this.library.protobuf.decodeTransaction(message.data);
    } catch (e) {
      this.library.logger.warn(
        `could not decode Transaction with protobuf from ${message.from}`
      );
      return;
    }

    try {
      // normalize and validate
      transaction = TransactionBase.normalizeTransaction(transaction);
    } catch (e) {
      this.library.logger.error('Received transaction parse error', {
        message,
        error: e.toString(),
      });
      return;
    }

    this.library.bus.message('onReceiveTransaction', transaction);
  };

  public sendVotes = async (votes: ManyVotes, address: string) => {
    const parts = address.split(':');
    const contact: PeerNode = {
      host: parts[0],
      port: Number(parts[1]),
    };
    try {
      const result = await this.modules.peer.request(
        'votes',
        { votes },
        contact
      );
    } catch (err) {
      this.library.logger.error('send votes error', err);
    }
  };

  public cleanup = (cb: any) => {
    this.library.logger.debug('Cleaning up core/transport');
    cb();
  };
}
