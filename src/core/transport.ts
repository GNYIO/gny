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
} from '../interfaces';

export default class Transport {
  private readonly library: IScope;
  public latestBlocksCache: any = new LRU(200);
  private blockHeaderMidCache: any = new LRU(1000);
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
  public onUnconfirmedTransaction = async (transaction: any) => {
    const encodedTransaction = this.library.protobuf.encodeTransaction(
      transaction
    );
    await this.modules.peer.p2p.broadcastTransactionAsync(encodedTransaction);
  };

  // broadcast to peers NewBlockMessage
  public onNewBlock = async (block, votes) => {
    this.latestBlocksCache.set(block.id, {
      block,
      votes: this.library.protobuf.encodeBlockVotes(votes).toString('base64'), // TODO, try/catch
    });

    const message = this.blockHeaderMidCache.get(block.id) || {
      id: block.id,
      height: block.height,
      prevBlockId: block.prevBlockId,
    };

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
      return;
    }

    const lastBlock = this.modules.blocks.getLastBlock();
    if (!lastBlock) {
      this.library.logger.error('Last block not exists');
      return;
    }

    let body: NewBlockMessage;
    try {
      body = this.library.protobuf.decodeNewBlockMessage(message.data);
    } catch (err) {
      this.library.logger.warn(
        `could not decode NewBlockMessage with protobuf from ${message.from}`
      );
      return;
    }

    const schema = this.library.joi.object({
      id: this.library.joi
        .string()
        .hex()
        .required(),
      height: this.library.joi
        .number()
        .integer()
        .positive()
        .required(),
      prevBlockId: this.library.joi
        .string()
        .hex()
        .required(),
    });
    const report = this.library.joi.validate(body, schema);
    if (report.error) {
      this.library.logger.error(
        `Invalid message body: ${report.error.message}`
      );
      return;
    }

    const height = body.height;
    const id = body.id;
    const prevBlockId = body.prevBlockId;
    const peer = message.peerInfo;

    if (
      height !== Number(lastBlock.height) + 1 ||
      prevBlockId !== lastBlock.id
    ) {
      this.library.logger.warn(
        'New block does not match with last block',
        body
      );
      this.library.logger.warn(
        `lastBlock: ${JSON.stringify(lastBlock, null, 2)}`
      );
      if (height > Number(lastBlock.height) + 5) {
        this.library.logger.warn('Receive new block header from long fork');
      } else {
        this.modules.loader.syncBlocksFromPeer(peer);
      }
      return;
    }
    this.library.logger.info('Receive new block header', { height, id });

    // TODO add type information
    let result;
    try {
      const params = { id };
      result = await this.modules.peer.request('newBlock', params, peer);
    } catch (err) {
      this.library.logger.error('Failed to get latest block data', err);
      return;
    }

    if (!result || !result.block || !result.votes) {
      this.library.logger.error('Invalid block data', result);
      return;
    }
    try {
      let block = result.block;
      let votes = this.library.protobuf.decodeBlockVotes(
        Buffer.from(result.votes, 'base64')
      );
      block = this.library.base.block.objectNormalize(block);
      votes = this.library.base.consensus.normalizeVotes(votes);
      this.latestBlocksCache.set(block.id, result);
      this.blockHeaderMidCache.set(block.id, body);
      this.library.bus.message('receiveBlock', block, votes);
    } catch (e) {
      this.library.logger.error(
        `normalize block or votes object error: ${e.toString()}`,
        result
      );
    }
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

    const schema = this.library.joi.object().keys({
      address: this.library.joi
        .string()
        .ipv4PlusPort()
        .required(),
      generatorPublicKey: this.library.joi
        .string()
        .hex()
        .required(),
      hash: this.library.joi
        .string()
        .hex()
        .required(),
      height: this.library.joi
        .number()
        .integer()
        .positive()
        .required(),
      id: this.library.joi
        .string()
        .hex()
        .required(),
      signature: this.library.joi
        .string()
        .hex()
        .required(),
      timestamp: this.library.joi
        .number()
        .integer()
        .positive()
        .required(),
    });
    const report = this.library.joi.validate(propose, schema);
    if (report.error) {
      this.library.logger.error(
        'Failed to validate propose ',
        report.error.message
      );
      return;
    }

    this.library.bus.message('receivePropose', propose);
  };

  // peerEvent
  private receivePeer_Transaction = (message: P2PMessage) => {
    if (this.modules.loader.syncing()) {
      return;
    }
    const lastBlock = this.modules.blocks.getLastBlock();
    const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
    if (slots.getNextSlot() - lastSlot >= 12) {
      this.library.logger.error('Blockchain is not ready', {
        getNextSlot: slots.getNextSlot(),
        lastSlot,
        lastBlockHeight: lastBlock.height,
      });
      return;
    }

    let transaction: any;
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
      transaction = this.library.base.transaction.objectNormalize(transaction);
    } catch (e) {
      this.library.logger.error('Received transaction parse error', {
        message,
        error: e.toString(),
      });
      return;
    }

    this.library.sequence.add(
      cb => {
        this.library.logger.info(
          `Received transaction ${transaction.id} from remote peer`
        );
        this.modules.transactions.processUnconfirmedTransaction(
          transaction,
          cb
        );
      },
      err => {
        if (err) {
          this.library.logger.warn(
            `Receive invalid transaction ${transaction.id}`,
            err
          );
        } else {
          // library.bus.message('unconfirmedTransaction', transaction, true)
        }
      }
    );
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
