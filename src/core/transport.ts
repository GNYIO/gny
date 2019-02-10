import * as _ from 'lodash';
import LRU = require('lru-cache');
import slots from '../utils/slots';
import { Modules, IScope, ManyVotes, PeerNode, NewBlockMessage } from '../interfaces';

export default class Transport {
  private readonly library: IScope;
  public latestBlocksCache: any = new LRU(200);
  private blockHeaderMidCache: any = new LRU(1000);
  private modules: Modules;

  constructor (scope: IScope) {
    this.library = scope;
  }

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope;
  }

  public onPeerReady = () => {
    this.modules.peer.p2p.subscribe('newBlockHeader', this.peerNewBlockHeader);
    this.modules.peer.p2p.subscribe('propose', this.peerPropose);
    this.modules.peer.p2p.subscribe('transaction', this.peerTransaction);
  }

  public onUnconfirmedTransaction = async (transaction: any) => {

    const encodedTransaction = this.library.protobuf.encodeTransaction(transaction);
    await this.modules.peer.p2p.broadcastTransactionAsync(encodedTransaction);
  }

  public onNewBlock = async (block, votes) => {
    this.latestBlocksCache.set(block.id,
      {
        block,
        votes: this.library.protobuf.encodeBlockVotes(votes).toString('base64'),
      }
    );

    const message = this.blockHeaderMidCache.get(block.id) || {
      id: block.id,
      height: block.height,
      prevBlockId: block.prevBlockId,
    };
    const encodedNewBlockMessage = this.library.protobuf.encodeNewBlockMessage(message);
    await this.modules.peer.p2p.broadcastNewBlockHeaderAsync(encodedNewBlockMessage);
  }

  public onNewPropose = async (propose) => {
    const encodedBlockPropose = this.library.protobuf.encodeBlockPropose(propose);
    await this.modules.peer.p2p.broadcastProposeAsync(encodedBlockPropose);
  }


  // peerEvent
  private peerNewBlockHeader = async (message) => {
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
      this.library.logger.warn('received wrong NewBlockMessage');
      return;
    }

    if (!body || !body.id || !body.height || !body.prevBlockId) {
      this.library.logger.error('Invalid message body');
      return;
    }
    const height = body.height;
    const id = body.id;
    const prevBlockId = body.prevBlockId;
    const peer = message.peerInfo;

    if (height !== lastBlock.height + 1 || prevBlockId !== lastBlock.id) {
      this.library.logger.warn('New block donnot match with last block', body);
      this.library.logger.warn(`lastBlock: ${JSON.stringify(lastBlock, null, 2)}`);
      if (height > lastBlock.height + 5) {
        this.library.logger.warn('Receive new block header from long fork');
      } else {
        this.modules.loader.syncBlocksFromPeer(peer);
      }
      return;
    }
    this.library.logger.info('Receive new block header', { height, id });

    // TODO
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
      let votes = this.library.protobuf.decodeBlockVotes(Buffer.from(result.votes, 'base64'));
      block = this.library.base.block.objectNormalize(block);
      votes = this.library.base.consensus.normalizeVotes(votes);
      this.latestBlocksCache.set(block.id, result);
      this.blockHeaderMidCache.set(block.id, body);
      this.library.bus.message('receiveBlock', block, votes);
    } catch (e) {
      this.library.logger.error(`normalize block or votes object error: ${e.toString()}`, result);
    }
  }

  // peerEvent
  private peerPropose = (message) => {
    try {
      const propose = this.library.protobuf.decodeBlockPropose(message.data);
      this.library.bus.message('receivePropose', propose);
    } catch (e) {
      this.library.logger.error('Receive invalid propose', e);
    }
  }

  // peerEvent
  private peerTransaction = (message) => {
    if (this.modules.loader.syncing()) {
      return;
    }
    const lastBlock = this.modules.blocks.getLastBlock();
    const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
    if (slots.getNextSlot() - lastSlot >= 12) {
      this.library.logger.error('Blockchain is not ready', { getNextSlot: slots.getNextSlot(), lastSlot, lastBlockHeight: lastBlock.height });
      return;
    }
    let transaction: any;
    try {
      transaction = this.library.protobuf.decodeTransaction(message.data);
      transaction = this.library.base.transaction.objectNormalize(transaction);
    } catch (e) {
      this.library.logger.error('Received transaction parse error', {
        message,
        error: e.toString(),
      });
      return;
    }

    this.library.sequence.add((cb) => {
      this.library.logger.info(`Received transaction ${transaction.id} from remote peer`);
      this.modules.transactions.processUnconfirmedTransaction(transaction, cb);
    }, (err) => {
      if (err) {
        this.library.logger.warn(`Receive invalid transaction ${transaction.id}`, err);
      } else {
        // library.bus.message('unconfirmedTransaction', transaction, true)
      }
    });
  }


  public sendVotes = async (votes: ManyVotes, address: string) => {
    const parts = address.split(':');
    const contact: PeerNode = {
      host: parts[0],
      port: Number(parts[1]),
    };
    try {
      const result = await this.modules.peer.request('votes', { votes }, contact);
    } catch (err) {
      this.library.logger.error('send votes error', err);
    }
  }

  public cleanup = (cb: any) => {
    this.library.logger.debug('Cleaning up core/transport');
    cb();
  }

}
