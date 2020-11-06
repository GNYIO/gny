import {
  V1_NEW_BLOCK_PROTOCOL,
  V1_VOTES,
  V1_COMMON_BLOCK,
  V1_GET_HEIGHT,
  V1_BLOCKS,
  Bundle,
  SimplePushTypeCallback,
} from '@gny/p2p';
import { joi } from '@gny/extended-joi';
import { StateHelper } from './StateHelper';
import {
  ApiResult,
  BlockIdWrapper,
  BlockAndVotes,
  ManyVotes,
  IBlock,
  CommonBlockWrapper,
  CommonBlockParams,
  CommonBlockResult,
  HeightWrapper,
  BlocksWrapper,
  BlocksWrapperParams,
} from '@gny/interfaces';
import * as PeerInfo from 'peer-info';
import {
  isCommonBlockParams,
  isBlocksWrapperParams,
  isBlockAndVotes,
  isManyVotes,
  isHeightWrapper,
  isBlockIdWrapper,
} from '@gny/type-validation';
import BigNumber from 'bignumber.js';
import { getBlocks as getBlocksFromApi } from '../http/util';

function V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle: Bundle) {
  // step1: node1 -> node2
  const request = async (
    peerInfo: PeerInfo,
    blockIdWrapper: BlockIdWrapper
  ): Promise<BlockAndVotes> => {
    const data = JSON.stringify(blockIdWrapper);

    const resultRaw = await bundle.directRequest(
      peerInfo,
      V1_NEW_BLOCK_PROTOCOL,
      data
    );

    const result = JSON.parse(resultRaw.toString());
    if (!isBlockAndVotes(result)) {
      throw new Error('[p2p] validation for requested isBlockPropose failed');
    }

    return result;
  };

  // step2: node2 -> node1
  const response = async (data: Buffer, cb) => {
    const body = JSON.parse(Buffer.from(data).toString());

    // validate id
    if (!isBlockIdWrapper(body)) {
      global.library.logger.info('[p2p] validaion for blockIdWrapper failed');
      return cb(new Error('validation failed'));
    }

    // no need for await
    const newBlock = StateHelper.GetBlockFromLatestBlockCache(body.id);
    if (!newBlock) {
      return cb(new Error('New block not found'));
    }

    const result: BlockAndVotes = {
      block: newBlock.block,
      votes: newBlock.votes,
    };

    return cb(null, JSON.stringify(result));
  };

  bundle.requestBlockAndVotes = request;
  bundle.directResponse(V1_NEW_BLOCK_PROTOCOL, response);
}

function V1_VOTES_HANDLER(bundle: Bundle) {
  // not duplex
  // async
  const request = async function(peerInfo: PeerInfo, votes: ManyVotes) {
    const data = JSON.stringify(votes);
    await bundle.pushOnly(peerInfo, V1_VOTES, data);
  };

  // not duplex
  // not async
  const response: SimplePushTypeCallback = function(
    err: Error,
    values: Buffer[]
  ) {
    if (err) {
      console.log(
        'received error while handling error from pushVotes (response)'
      );
      console.error(err);

      return;
    }

    const votes: ManyVotes = JSON.parse(Buffer.from(values[0]).toString());

    if (!isManyVotes(votes)) {
      global.library.logger.info(
        `[p2p] validation for ManyVotes failed: ${JSON.stringify(votes)}`
      );
      return;
    }

    global.library.logger.info(
      `[p2p] received "${votes.signatures.length}" votes for block: ${
        votes.id
      }, h: ${votes.height}`
    );

    global.library.bus.message('onReceiveVotes', votes);
  };

  bundle.pushVotesToPeer = request;
  bundle.handlePushOnly(V1_VOTES, response);
}

function V1_COMMON_BLOCK_HANDLER(bundle: Bundle) {
  // step1: node1 -> node2
  const request = async (
    peerInfo: PeerInfo,
    commonBlockParams: CommonBlockParams
  ): Promise<CommonBlockResult> => {
    const data = JSON.stringify(commonBlockParams);

    const resultRaw = await bundle.directRequest(
      peerInfo,
      V1_COMMON_BLOCK,
      data
    );
    const result: CommonBlockResult = JSON.parse(resultRaw.toString());

    return result;
  };

  const response = async (data: Buffer, cb) => {
    const body = JSON.parse(Buffer.from(data).toString());

    if (!isCommonBlockParams(body)) {
      return cb(new Error('validation failed'));
    }

    // prevent DDOS attack
    const difference = new BigNumber(body.max).minus(body.min).absoluteValue();
    if (difference.isGreaterThanOrEqualTo(10)) {
      return cb(new Error('too big min,max'));
    }

    const max: string = body.max;
    const min: string = body.min;
    const ids: string[] = body.ids;
    try {
      let blocks = await global.app.sdb.getBlocksByHeightRange(min, max);
      if (!blocks || !blocks.length) {
        return cb(new Error('Blocks not found'));
      }
      global.library.logger.warn(
        `blocks-in-transportApi-commonBlock: ${JSON.stringify(blocks)}`
      );
      blocks = blocks.reverse();
      let commonBlock: IBlock = null;
      for (const i in ids) {
        if (blocks[i].id === ids[i]) {
          commonBlock = blocks[i];
          break;
        }
      }
      if (!commonBlock) {
        return cb(new Error('Common block not found'));
      }
      const result: ApiResult<CommonBlockWrapper> = {
        success: true,
        common: commonBlock,
      };
      return cb(null, JSON.stringify(result));
    } catch (e) {
      global.app.logger.error('Failed to find common block:');
      global.app.logger.error(e);

      return cb(new Error('Failed to find common block'));
    }
  };

  bundle.requestCommonBlock = request;
  bundle.directResponse(V1_COMMON_BLOCK, response);
}

function V1_GET_HEIGH_HANDLER(bundle: Bundle) {
  const request = async (peerInfo: PeerInfo): Promise<HeightWrapper> => {
    const data = JSON.stringify('no param');

    const resultRaw = await bundle.directRequest(peerInfo, V1_GET_HEIGHT, data);
    const result: HeightWrapper = JSON.parse(Buffer.from(resultRaw).toString());

    if (!isHeightWrapper(result)) {
      throw new Error('[p2p] validation for isHeightWrapper failed');
    }

    return result;
  };

  const response = async (data: Buffer, cb) => {
    // no need for "data" variable
    const body: string = JSON.parse(Buffer.from(data).toString());

    const lastBlock = StateHelper.getState().lastBlock;
    const result: HeightWrapper = {
      height: lastBlock.height,
    };
    cb(null, JSON.stringify(result));
  };

  bundle.requestHeight = request;
  bundle.directResponse(V1_GET_HEIGHT, response);
}

function V1_BLOCKS_HANDLER(bundle: Bundle) {
  const request = async (
    peerInfo: PeerInfo,
    params: BlocksWrapperParams
  ): Promise<IBlock[]> => {
    const data = JSON.stringify(params);

    const resultRaw = await bundle.directRequest(peerInfo, V1_BLOCKS, data);

    const result: HeightWrapper = JSON.parse(resultRaw.toString());
    return result;
  };

  const response = async (data: Buffer, cb) => {
    const body: BlocksWrapperParams = JSON.parse(Buffer.from(data).toString());
    body.limit = body.limit || 200;

    if (!isBlocksWrapperParams(body)) {
      return cb(new Error('blocksync params validation failed'));
    }

    const blocksLimit: number = body.limit;
    const lastBlockId: string = body.lastBlockId;

    try {
      const lastBlock = await global.app.sdb.getBlockById(lastBlockId);
      if (!lastBlock) throw new Error(`Last block not found: ${lastBlockId}`);

      const minHeight = new BigNumber(lastBlock.height).plus(1).toFixed();
      const maxHeight = new BigNumber(minHeight)
        .plus(blocksLimit)
        .minus(1)
        .toFixed();
      // global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight, true); // better?
      const blocks: BlocksWrapper = await getBlocksFromApi(
        minHeight,
        maxHeight,
        true
      );

      return cb(null, JSON.stringify(blocks));
    } catch (e) {
      global.app.logger.error(
        '/peer/blocks (POST), Failed to get blocks with transactions'
      );
      global.app.logger.error(e);

      const result: IBlock[] = [];
      return cb(null, JSON.stringify(result));
    }
  };

  bundle.requestBlocks = request;
  bundle.directResponse(V1_BLOCKS, response);
}

export function attachDirectP2PCommunication(bundle: Bundle) {
  V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle);
  V1_VOTES_HANDLER(bundle);
  V1_COMMON_BLOCK_HANDLER(bundle);
  V1_GET_HEIGH_HANDLER(bundle);
  V1_BLOCKS_HANDLER(bundle);
}
