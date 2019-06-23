import * as _ from 'lodash';
import {
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
import { StateHelper } from './StateHelper';
import Peer from './peer';

export default class Transport {
  // subscribe to peer events
  public static onPeerReady = () => {
    Peer.p2p.subscribe('newBlockHeader', Transport.receivePeer_NewBlockHeader);
    Peer.p2p.subscribe('propose', Transport.receivePeer_Propose);
    Peer.p2p.subscribe('transaction', Transport.receivePeer_Transaction);
  };

  // broadcast to peers Transaction
  public static onUnconfirmedTransaction = async (transaction: Transaction) => {
    const encodedTransaction = global.library.protobuf.encodeTransaction(
      transaction
    );
    await Peer.p2p.broadcastTransactionAsync(encodedTransaction);
  };

  // broadcast to peers NewBlockMessage
  public static onNewBlock = async (block: IBlock, votes: ManyVotes) => {
    let blockAndVotes: BlockAndVotes = undefined;
    try {
      blockAndVotes = {
        block,
        votes: global.library.protobuf
          .encodeBlockVotes(votes)
          .toString('base64'),
      };
    } catch (err) {
      global.library.logger.error('could not encode blockVotes');
      return;
    }

    StateHelper.SetBlockToLatestBlockCache(block.id, blockAndVotes);

    const message: NewBlockMessage =
      StateHelper.GetBlockHeaderMidCache(block.id) ||
      ({
        id: block.id,
        height: block.height,
        prevBlockId: block.prevBlockId,
      } as NewBlockMessage);

    let encodedNewBlockMessage: Buffer;
    try {
      encodedNewBlockMessage = global.library.protobuf.encodeNewBlockMessage(
        message
      );
    } catch (err) {
      global.library.logger.warn(
        'could not encode NewBlockMessage with protobuf'
      );
      return;
    }
    await Peer.p2p.broadcastNewBlockHeaderAsync(encodedNewBlockMessage);
  };

  // broadcast to peers Propose
  public static onNewPropose = async (propose: BlockPropose) => {
    let encodedBlockPropose: Buffer;
    try {
      encodedBlockPropose = global.library.protobuf.encodeBlockPropose(propose);
    } catch (err) {
      global.library.logger.warn('could not encode Propose with protobuf');
      return;
    }
    await Peer.p2p.broadcastProposeAsync(encodedBlockPropose);
  };

  // peerEvent
  public static receivePeer_NewBlockHeader = async (message: P2PMessage) => {
    if (StateHelper.IsSyncing()) {
      // TODO access state
      return;
    }

    let newBlockMsg;
    try {
      newBlockMsg = global.library.protobuf.decodeNewBlockMessage(message.data);
    } catch (err) {
      global.library.logger.warn(
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
      result = await Peer.request('newBlock', params, peer);
    } catch (err) {
      global.library.logger.error('Failed to get latest block data', err);
      return;
    }

    if (!result || !result.block || !result.votes) {
      global.library.logger.error('Invalid block data', result);
      return;
    }

    let block: IBlock;
    let votes: ManyVotes;
    try {
      block = result.block;
      votes = global.library.protobuf.decodeBlockVotes(
        Buffer.from(result.votes, 'base64')
      );
      block = BlockBase.normalizeBlock(block);
      votes = ConsensusBase.normalizeVotes(votes);

      StateHelper.SetBlockToLatestBlockCache(block.id, result); // TODO: make side effect more predictable
      StateHelper.SetBlockHeaderMidCache(block.id, newBlockMsg); // TODO: make side effect more predictable
    } catch (e) {
      global.library.logger.error(
        `normalize block or votes object error: ${e.toString()}`,
        result
      );
    }

    global.library.bus.message(
      'onReceiveBlock',
      newBlockMsg,
      message.peerInfo,
      block,
      votes
    );
  };

  // peerEvent
  public static receivePeer_Propose = (message: P2PMessage) => {
    let propose: BlockPropose;
    try {
      propose = global.library.protobuf.decodeBlockPropose(message.data);
    } catch (e) {
      global.library.logger.warn(
        `could not decode Propose with protobuf from ${message.from}`
      );
      return;
    }

    if (!isBlockPropose(propose)) {
      global.library.logger.warn('block propose validation did not work');
      return;
    }

    global.library.bus.message('onReceivePropose', propose);
  };

  // peerEvent
  public static receivePeer_Transaction = (message: P2PMessage) => {
    let transaction: Transaction;
    try {
      transaction = global.library.protobuf.decodeTransaction(message.data);
    } catch (e) {
      global.library.logger.warn(
        `could not decode Transaction with protobuf from ${message.from}`
      );
      return;
    }

    try {
      // normalize and validate
      transaction = TransactionBase.normalizeTransaction(transaction);
    } catch (e) {
      global.library.logger.error('Received transaction parse error', {
        message,
        error: e.toString(),
      });
      return;
    }

    global.library.bus.message('onReceiveTransaction', transaction);
  };

  public static sendVotes = async (votes: ManyVotes, address: string) => {
    const parts = address.split(':');
    const contact: PeerNode = {
      host: parts[0],
      port: Number(parts[1]),
    };
    try {
      const result = await Peer.request('votes', { votes }, contact);
    } catch (err) {
      // refactor
      global.app.logger.error('send votes error', err);
    }
  };
}
