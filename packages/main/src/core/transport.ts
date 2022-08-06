import * as _ from 'lodash';
import {
  ManyVotes,
  NewBlockMessage,
  P2PMessage,
  BlockPropose,
  IBlock,
  BlockAndVotes,
  ICoreModule,
  UnconfirmedTransaction,
  BlockIdWrapper,
  P2PPeerIdAndMultiaddr,
  SimplePeerInfo,
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
import {
  serializedSpanContext,
  createSpanContextFromSerializedParentContext,
  createReferenceFromSerializedParentContext,
  TracerWrapper,
  getSmallBlockHash,
  ISpan,
  ISerializedSpanContext,
} from '@gny/tracer';

import * as PeerId from 'peer-id';
const uint8ArrayToString = require('uint8arrays/to-string');
const uint8ArrayFromString = require('uint8arrays/from-string');
import * as multiaddr from 'multiaddr';

export default class Transport implements ICoreModule {
  // broadcast to peers Transaction
  public static onUnconfirmedTransaction = async (
    transaction: UnconfirmedTransaction,
    parentSpan: ISpan
  ) => {
    const span = global.library.tracer.startSpan(
      'broadcast unconfirmed transaction',
      {
        childOf: parentSpan.context(),
      }
    );
    span.setTag('transactionId', transaction.id);
    span.setTag('senderId', transaction.senderId);
    span.log({
      unconfirmedTransaction: transaction,
    });

    const obj = _.cloneDeep(transaction);
    if (typeof obj.signatures !== 'string') {
      obj.signatures = JSON.stringify(obj.signatures);
    }
    if (typeof obj.args !== 'string') {
      obj.args = JSON.stringify(obj.args);
    }

    const raw: TracerWrapper<UnconfirmedTransaction> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: obj,
    };

    const encodedTransaction = uint8ArrayFromString(JSON.stringify(raw));
    await Peer.p2p.broadcastTransactionAsync(encodedTransaction);

    span.finish();
  };

  // broadcast to peers NewBlockMessage
  public static onNewBlock = async (
    block: IBlock,
    votes: ManyVotes,
    parentSpan: ISpan
  ) => {
    const span = global.app.tracer.startSpan('onNewBlock', {
      childOf: parentSpan.context(),
    });
    span.setTag('hash', getSmallBlockHash(block));
    span.setTag('height', block.height);
    span.setTag('id', block.id);

    let blockAndVotes: BlockAndVotes = undefined;
    try {
      blockAndVotes = {
        block,
        votes: global.library.protobuf
          .encodeBlockVotes(votes)
          .toString('base64'),
      };
    } catch (err) {
      span.setTag('error', true);
      span.log({
        value: 'could not encode blockVotes',
      });
      span.finish();

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

    const wrapped: TracerWrapper<NewBlockMessage> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: message,
    };

    let encodedNewBlockMessage: Uint8Array;
    try {
      encodedNewBlockMessage = uint8ArrayFromString(JSON.stringify(wrapped));
    } catch (err) {
      global.library.logger.warn(
        'could not encode NewBlockMessage with protobuf'
      );

      span.setTag('error', true);
      span.log({
        value: 'could not encode NewBlockMessage with protobuf',
      });
      span.finish();

      return;
    }
    await Peer.p2p.broadcastNewBlockHeaderAsync(encodedNewBlockMessage);

    span.finish();
  };

  // broadcast to peers Propose
  public static onNewPropose = async (
    propose: BlockPropose,
    parentSpan: ISpan
  ) => {
    global.library.logger.info(`[p2p] broadcasting propose "${propose.id}"`);

    const span = global.app.tracer.startSpan('broadcasting BlockPropose', {
      childOf: parentSpan.context(),
    });
    span.setTag('hash', getSmallBlockHash(propose));
    span.setTag('height', propose.height);
    span.setTag('id', propose.id);
    span.setTag('proposeHash', propose.hash);

    const totalVotes = StateHelper.getState().pendingVotes;

    span.log({
      value: 'has not enough votes',
      pendingVotes: (totalVotes && totalVotes.signatures.length) || 0,
    });
    span.log({
      propose,
    });

    const full: TracerWrapper<BlockPropose> = {
      spanId: serializedSpanContext(global.app.tracer, span.context()),
      data: propose,
    };

    let encodedBlockPropose: Uint8Array;
    try {
      encodedBlockPropose = uint8ArrayFromString(JSON.stringify(full));
    } catch (err) {
      global.library.logger.warn('could not encode Propose with protobuf');

      span.setTag('error', true);
      span.log({
        value: `Failed to encode block propose: ${err.message}`,
      });
      span.finish();

      return;
    }
    await Peer.p2p.broadcastProposeAsync(encodedBlockPropose);

    span.finish();
  };

  // peerEvent
  public static receivePeer_NewBlockHeader = async (message: P2PMessage) => {
    let wrapper: TracerWrapper<NewBlockMessage>;
    try {
      wrapper = JSON.parse(uint8ArrayToString(message.data)); // not toString() ?
    } catch (err) {
      global.library.logger.warn(
        `could not decode NewBlockMessage with protobuf from ${message.from}`
      );
      return;
    }

    global.library.logger.info(
      `[p2p][receivePeer_NewBlockHeader] wrapper: ${JSON.stringify(
        wrapper,
        null,
        2
      )}`
    );

    const parentReference = createReferenceFromSerializedParentContext(
      global.library.tracer,
      wrapper.spanId
    );
    const span = global.library.tracer.startSpan('received Block Header', {
      references: [parentReference],
    });

    const isSyncing = StateHelper.IsSyncing();
    const modules = !StateHelper.ModulesAreLoaded();

    if (isSyncing || modules) {
      const isSyncingSpan = global.library.tracer.startSpan(
        'received Block Header (is syncing)',
        {
          childOf: span.context(),
        }
      );
      const state = StateHelper.getState();
      isSyncingSpan.log({
        lastBlock: state.lastBlock,
      });
      isSyncingSpan.finish();

      global.library.logger.info(
        `[p2p] ignoring broadcasted newBlockHeader because we are syncing`
      );
      span.finish();

      return;
    }

    const newBlockMsg = wrapper.data;
    if (!isNewBlockMessage(newBlockMsg)) {
      span.setTag('error', true);
      span.log({
        value: '[p2p] validation for received NewBlockMessage failed',
      });
      span.finish();

      return;
    }

    span.setTag('hash', getSmallBlockHash(newBlockMsg));
    span.setTag('height', newBlockMsg.height);
    span.setTag('id', newBlockMsg.id);

    const params: BlockIdWrapper = {
      id: newBlockMsg.id,
    };

    let peerId: PeerId;
    let result: TracerWrapper<BlockAndVotes>;
    try {
      const bundle = Peer.p2p;

      peerId = await bundle.findPeerInfoInDHT(message);

      result = await bundle.requestBlockAndVotes(peerId, params, span);
    } catch (err) {
      global.library.logger.error('[p2p] Failed to get latest block data');
      global.library.logger.error(err);

      span.setTag('error', true);
      span.log({
        value: `[p2p] Failed to get latest block data, err: ${err.message}`,
      });

      span.finish();
      return;
    }
    span.finish();

    const requestBlockVotesSpanContext = createSpanContextFromSerializedParentContext(
      global.library.tracer,
      result.spanId
    );
    const receiveBlockSpan = global.library.tracer.startSpan(
      'going to receiveBlock',
      {
        childOf: requestBlockVotesSpanContext,
      }
    );

    if (!isBlockAndVotes(result.data)) {
      global.library.logger.error(
        `[p2p] validation failed blockAndVotes: ${JSON.stringify(
          result,
          null,
          2
        )}`
      );

      receiveBlockSpan.setTag('error', true);
      receiveBlockSpan.log({
        value: `Failed to failed blockAndVotes`,
      });
      receiveBlockSpan.finish();

      return;
    }

    receiveBlockSpan.setTag(
      'hash',
      getSmallBlockHash(result.data.block as IBlock)
    );
    receiveBlockSpan.setTag('height', result.data.block.height);
    receiveBlockSpan.setTag('id', result.data.block.id);

    let block: IBlock = null;
    let votes: ManyVotes;
    try {
      block = result.data.block;
      votes = global.library.protobuf.decodeBlockVotes(
        Buffer.from(result.data.votes, 'base64')
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

        receiveBlockSpan.setTag('error', true);
        receiveBlockSpan.log({
          value: 'NewBlockMessage and Block do not',
        });
        receiveBlockSpan.log({
          newBlockMsg,
          block,
        });
        receiveBlockSpan.finish();

        return;
      }

      StateHelper.SetBlockToLatestBlockCache(block.id, result.data); // TODO: make side effect more predictable
      StateHelper.SetBlockHeaderMidCache(block.id, newBlockMsg); // TODO: make side effect more predictable
    } catch (e) {
      receiveBlockSpan.setTag('error', true);
      receiveBlockSpan.log({
        value: `normalize block or votes object error: ${e.toString()}`,
      });
      receiveBlockSpan.finish();

      global.library.logger.error(
        `normalize block or votes object error: ${JSON.stringify(
          result,
          null,
          2
        )}`
      );
      global.library.logger.error(e);

      return;
    }

    global.library.bus.message(
      'onReceiveBlock',
      peerId,
      block,
      votes,
      receiveBlockSpan
    );
  };

  // peerEvent
  public static receivePeer_Propose = (message: P2PMessage) => {
    global.library.logger.info(`received propose from ${message.from}`);
    let wrapper: TracerWrapper<BlockPropose>;
    try {
      wrapper = JSON.parse(message.data.toString());
    } catch (e) {
      global.library.logger.warn(
        `could not decode Propose with protobuf from ${message.from}`
      );
      return;
    }

    const parentReference = createReferenceFromSerializedParentContext(
      global.library.tracer,
      wrapper.spanId
    );
    const span = global.library.tracer.startSpan('received Block Propose', {
      references: [parentReference],
    });

    const state = StateHelper.getState();
    span.log({
      lastPropose: state.lastPropose,
    });

    const isSyncing = StateHelper.IsSyncing();
    const modules = !StateHelper.ModulesAreLoaded();
    if (isSyncing || modules) {
      global.library.logger.info(
        `[p2p] ignoring propose because we are syncing`
      );
      span.log({
        value: `is currently syncing`,
        isSyncing,
        modules,
      });

      const isSyncingSpan = global.library.tracer.startSpan(
        'received Block Propose (but syncing)',
        {
          childOf: span.context(),
        }
      );
      isSyncingSpan.log({
        lastBlock: state.lastBlock,
      });
      isSyncingSpan.finish();

      span.finish();
      return;
    }

    const propose = wrapper.data;
    if (!isBlockPropose(propose)) {
      global.library.logger.warn('block propose validation did not work');

      span.setTag('error', true);
      span.log({
        value: 'propose validation failed',
        received: propose,
      });
      span.finish();
      return;
    }

    span.setTag('hash', getSmallBlockHash(propose));
    span.setTag('height', propose.height);
    span.setTag('id', propose.id);
    span.setTag('proposeHash', propose.hash);
    span.log({
      receivedPropose: propose,
    });

    global.library.logger.info(
      `[p2p] onReceivePropose from "${propose.address}" for block ${
        propose.id
      }, height: ${propose.height}`
    );
    span.finish();

    global.library.bus.message('onReceivePropose', propose, message, span);
  };

  // peerEvent
  public static receiveNew_Member = async (message: P2PMessage) => {
    // 0. check if peer is myself
    // validate peerId and Multiaddresses
    // 1. check if peer is in Addressbook
    // if not, add to AddressBook
    // 2.check if there is a connection
    // if not, dial

    // dial, even when syncing

    let raw: P2PPeerIdAndMultiaddr = null;
    try {
      raw = JSON.parse(uint8ArrayToString(message.data));
    } catch (err) {
      global.library.logger.error(
        `[p2p] "newMember" event, could not parse data: ${err.message}`
      );
      return;
    }

    const parsed = raw;

    // P2PPeerIdAndMultiaddr
    if (!isP2PPeerIdAndMultiaddr(parsed, global.library.logger)) {
      return;
    }

    let peerId = null;
    try {
      peerId = PeerId.createFromCID(parsed.peerId);
    } catch (err) {
      global.library.logger.info(`[p2p][newMember] error: ${err.message}`);

      return;
    }

    if (peerId.equals(Peer.p2p.peerId)) {
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
      Peer.p2p.peerStore.addressBook.set(
        peerId,
        parsed.multiaddr.map(x => multiaddr(x))
      );
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
    } else {
    }
  };

  public static receivePeers_from_rendezvous_Broadcast = async (
    message: P2PMessage
  ) => {
    global.library.logger.info(
      `[p2p][rendezvous] received peers from rendezvous node`
    );

    let raw: { spanId: ISerializedSpanContext; peers: SimplePeerInfo[] } = null;
    try {
      raw = JSON.parse(message.data.toString());
    } catch (err) {
      global.library.logger.error(
        `[p2p] "rondezvous" broadcast, could not parse data`
      );
      return;
    }

    const context = createSpanContextFromSerializedParentContext(
      global.library.tracer,
      raw.spanId
    );

    const span = global.library.tracer.startSpan('receive rendezvous', {
      childOf: context,
    });
    span.finish();

    for (let i = 0; i < raw.peers.length; ++i) {
      const one = raw.peers[i];

      const parsed: P2PPeerIdAndMultiaddr = {
        multiaddr: one.multiaddrs,
        peerId: one.id.id,
      };

      await Transport.receiveSelf(parsed);
    }
  };

  public static receiveSelf = async (parsed: P2PPeerIdAndMultiaddr) => {
    // 0. check if peer is myself
    // validate peerId and Multiaddresses
    // 1. check if peer is in Addressbook
    // if not, add to AddressBook
    // 2.check if there is a connection
    // if not, dial

    // P2PPeerIdAndMultiaddr
    global.library.logger.info(
      `[p2p][rendezvous] self: ${JSON.stringify(parsed, null, 2)}`
    );
    if (!isP2PPeerIdAndMultiaddr(parsed, global.library.logger)) {
      global.library.logger.error(
        '[p2p][rendezvous] received broadcast self is not multiaddr'
      );
      return;
    }

    let peerId = null;
    try {
      peerId = PeerId.createFromCID(parsed.peerId);
    } catch (err) {
      global.library.logger.info(`[p2p][self] error: ${err.message}`);
      return;
    }

    if (peerId.equals(Peer.p2p.peerId)) {
      global.library.logger.info(`[p2p][rendezvous] "self" is me`);
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
          `[p2p][rendezvous] "self" has no good addresses, will not add to peerStore: ${JSON.stringify(
            parsed.multiaddr
          )} `
        );

        return;
      }

      // TODO: do not add addresses like 127.0.0.1 or 0.0.0.0
      Peer.p2p.peerStore.addressBook.set(
        peerId,
        parsed.multiaddr.map(x => multiaddr(x))
      );
      global.library.logger.info(
        `[p2p][rendezvous] "self" added peer "${peerId.toB58String()}" to peerBook`
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
          `[p2p] "self" dial failed for "${peerId.toB58String()}"`
        );
      }
    }
  };

  public static receivePeer_Transaction = (message: P2PMessage) => {
    if (StateHelper.IsSyncing()) {
      global.library.logger.info(
        `[p2p] ignoring transaction because we are syncing`
      );
      return;
    }

    let wrapper: TracerWrapper<UnconfirmedTransaction>;
    try {
      wrapper = JSON.parse(message.data.toString());
    } catch (e) {
      global.library.logger.warn(
        `could not decode Transaction with protobuf from ${message.from}`
      );
      return;
    }

    const parentReference = createReferenceFromSerializedParentContext(
      global.library.tracer,
      wrapper.spanId
    );
    const span = global.library.tracer.startSpan('received trs broadcast', {
      references: [parentReference],
    });

    let unconfirmedTrs = wrapper.data;
    try {
      // normalize and validate
      unconfirmedTrs = TransactionBase.normalizeUnconfirmedTransaction(
        unconfirmedTrs
      );
    } catch (e) {
      span.setTag('error', true);
      span.log({
        message: message,
        value: e.toString(),
      });
      span.finish();

      global.library.logger.error(
        `Received transaction parse error: ${JSON.stringify(message, null, 2)}`
      );
      global.library.logger.error(e);

      return;
    }

    span.setTag('transactionId', unconfirmedTrs.id);
    span.setTag('senderId', unconfirmedTrs.senderId);

    global.library.logger.info(
      `[p2p] received from "${message.from}" transactionId: ${
        unconfirmedTrs.id
      }`
    );
    global.library.bus.message('onReceiveTransaction', unconfirmedTrs, span);

    span.finish();
  };
}
