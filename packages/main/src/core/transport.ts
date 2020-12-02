import * as _ from 'lodash';
import {
  ManyVotes,
  PeerNode,
  NewBlockMessage,
  P2PMessage,
  BlockPropose,
  ITransaction,
  IBlock,
  BlockAndVotes,
  ICoreModule,
  UnconfirmedTransaction,
  BlockIdWrapper,
  P2PPeerIdAndMultiaddr,
} from '@gny/interfaces';
import { BlockBase } from '@gny/base';
import { ConsensusBase } from '@gny/base';
import { TransactionBase } from '@gny/base';
import {
  isBlockPropose,
  isNewBlockMessage,
  isBlockAndVotes,
  isP2PPeerIdAndMultiaddr,
} from '@gny/type-validation';
import { StateHelper } from './StateHelper';
import Peer from './peer';
import { BlocksHelper } from './BlocksHelper';
import * as PeerId from 'peer-id';
const uint8ArrayToString = require('uint8arrays/to-string');
const uint8ArrayFromString = require('uint8arrays/from-string');
import * as multiaddr from 'multiaddr';

export default class Transport implements ICoreModule {
  // broadcast to peers Transaction
  public static onUnconfirmedTransaction = async (
    transaction: UnconfirmedTransaction
  ) => {
    const encodedTransaction = global.library.protobuf.encodeUnconfirmedTransaction(
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

    let encodedNewBlockMessage: Uint8Array;
    try {
      encodedNewBlockMessage = uint8ArrayFromString(JSON.stringify(message));
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
    global.library.logger.info(`[p2p] broadcasting propose "${propose.id}"`);

    let encodedBlockPropose: Uint8Array;
    try {
      encodedBlockPropose = uint8ArrayFromString(JSON.stringify(propose));
    } catch (err) {
      global.library.logger.warn('could not encode Propose with protobuf');
      return;
    }
    await Peer.p2p.broadcastProposeAsync(encodedBlockPropose);
  };

  // peerEvent
  public static receivePeer_NewBlockHeader = async (message: P2PMessage) => {
    if (StateHelper.IsSyncing()) {
      global.library.logger.info(
        `[p2p] ignoring broadcasting newBlockHeader because we are syncing`
      );
      return;
    }

    let newBlockMsg;
    try {
      newBlockMsg = JSON.parse(uint8ArrayToString(message.data));
    } catch (err) {
      global.library.logger.warn(
        `could not decode NewBlockMessage with protobuf from ${message.from}`
      );
      return;
    }

    if (!isNewBlockMessage(newBlockMsg)) {
      return;
    }

    let peerId: PeerId;
    let result: BlockAndVotes;
    try {
      const params: BlockIdWrapper = { id: newBlockMsg.id };

      const bundle = Peer.p2p;

      peerId = await bundle.findPeerInfoInDHT(message);

      result = await bundle.requestBlockAndVotes(peerId, params);
    } catch (err) {
      global.library.logger.error('[p2p] Failed to get latest block data');
      global.library.logger.error(err);
      return;
    }

    if (!isBlockAndVotes(result)) {
      global.library.logger.error(
        `[p2p] validation failed blockAndVotes: ${JSON.stringify(
          result,
          null,
          2
        )}`
      );
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

      global.library.logger.info(
        `[p2p] got "${
          votes.signatures.length
        }" BlockVotes from peer ${peerId.toB58String()}`
      );

      // validate the received Block and NewBlockMessage against each other
      // a malicious Peer could send a wrong block
      if (!BlocksHelper.IsNewBlockMessageAndBlockTheSame(newBlockMsg, block)) {
        global.app.logger.warn('NewBlockMessage and Block do not');
        return;
      }

      StateHelper.SetBlockToLatestBlockCache(block.id, result); // TODO: make side effect more predictable
      StateHelper.SetBlockHeaderMidCache(block.id, newBlockMsg); // TODO: make side effect more predictable
    } catch (e) {
      global.library.logger.error(
        `normalize block or votes object error: ${JSON.stringify(
          result,
          null,
          2
        )}`
      );
      global.library.logger.error(e);
    }

    global.library.bus.message('onReceiveBlock', peerId, block, votes);
  };

  // peerEvent
  public static receivePeer_Propose = (message: P2PMessage) => {
    if (StateHelper.IsSyncing()) {
      global.library.logger.info(
        `[p2p] ignoring propose because we are syncing`
      );
      return;
    }

    global.library.logger.info(`received propose from ${message.from}`);
    let propose: BlockPropose;
    try {
      propose = JSON.parse(uint8ArrayToString(message.data));
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

    global.library.logger.info(
      `[p2p] onReceivePropose from "${propose.address}" for block ${
        propose.id
      }, height: ${propose.height}`
    );
    global.library.bus.message('onReceivePropose', propose, message);
  };

  // peerEvent
  public static receiveNew_Member = async (message: P2PMessage) => {
    // dial, even when syncing
    global.library.logger.info(
      `[p2p] received newMember msg from ${message.from}`
    );

    let parsed = null;
    try {
      parsed = JSON.parse(uint8ArrayToString(message.data));
    } catch (err) {
      global.library.logger.error(
        `[p2p] "newMember" event, could not parse data: ${err.message}`
      );
      return;
    }

    // P2PPeerIdAndMultiaddr
    if (!isP2PPeerIdAndMultiaddr(parsed, global.library.logger)) {
      return;
    }
    console.log(
      `[p2p] received new member, ${JSON.stringify(parsed, null, 2)}`
    );

    const peerId = PeerId.createFromB58String(parsed.peerId);
    if (peerId.equals(Peer.p2p)) {
      global.library.logger.info(`[p2p] "newMember" is me`);
      return;
    }

    // is in PeerStore
    const test = Peer.p2p.peerStore.addressBook.get(peerId);
    if (test === undefined) {
      const multi = parsed.multiaddr.filter(x => {
        const address = multiaddr(x).nodeAddress().address;
        if (address === '0.0.0.0' || address === '127.0.0.1') {
          return false;
        } else {
          return true;
        }
      });
      if (multi.length === 0) {
        global.library.logger.error(
          `[p2p] "newMember" has no good addresses, will not add to peerStore: ${JSON.stringify(
            parsed.multiaddr
          )} `
        );
        return;
      }

      // TODO: do not add addresses like 127.0.0.1 or 0.0.0.0
      Peer.p2p.peerStore.addressBook.set(peerId, parsed.multiaddr);
      global.library.logger.info(
        `[p2p] "newMember" added peer "${peerId.toB58String()}" to peerBook`
      );
    }

    // has connection
    const connections = Array.from(Peer.p2p.connections.keys());
    const inConnection = connections.find(x => x === parsed.peerId);
    // if not, dial
    if (!inConnection) {
      try {
        await Peer.p2p.dial(peerId);
      } catch (err) {
        global.library.logger.info(
          `[p2p] "newMember" dial failed for "${peerId.toB58String()}"`
        );
      }
    }

    // 0. check if peer is myself
    // validate peerId and Multiaddresses
    // 1. check if peer is in Addressbook
    // if not, add to AddressBook
    // 2.check if there is a connection
    // if not, dial
  };

  public static receivePeer_Transaction = (message: P2PMessage) => {
    if (StateHelper.IsSyncing()) {
      global.library.logger.info(
        `[p2p] ignoring transaction because we are syncing`
      );
      return;
    }

    let unconfirmedTrs: UnconfirmedTransaction;
    try {
      unconfirmedTrs = global.library.protobuf.decodeUnconfirmedTransaction(
        message.data
      );
    } catch (e) {
      global.library.logger.warn(
        `could not decode Transaction with protobuf from ${message.from}`
      );
      return;
    }

    try {
      // normalize and validate
      unconfirmedTrs = TransactionBase.normalizeUnconfirmedTransaction(
        unconfirmedTrs
      );
    } catch (e) {
      global.library.logger.error(
        `Received transaction parse error: ${JSON.stringify(message, null, 2)}`
      );
      global.library.logger.error(e);

      return;
    }

    global.library.logger.info(
      `[p2p] received from "${message.from}" transactionId: ${
        unconfirmedTrs.id
      }`
    );
    global.library.bus.message('onReceiveTransaction', unconfirmedTrs);
  };
}
