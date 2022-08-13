import { SimplePushTypeCallback } from '@gny/p2p';
import { StateHelper } from './StateHelper';
import {
  BlockIdWrapper,
  BlockAndVotes,
  ManyVotes,
  IBlock,
  CommonBlockParams,
  HeightWrapper,
  BlocksWrapperParams,
  BufferList,
} from '@gny/interfaces';
import {
  isCommonBlockParams,
  isBlocksWrapperParams,
  isBlockAndVotes,
  isManyVotes,
  isHeightWrapper,
  isBlockIdWrapper,
} from '@gny/type-validation';
import BigNumber from 'bignumber.js';
import * as PeerId from 'peer-id';
import { TracerWrapper, getSmallBlockHash } from '@gny/tracer';

import { getBlocks as getBlocksFromApi } from '../http/util';
import {
  ISpan,
  serializedSpanContext,
  createSpanContextFromSerializedParentContext,
} from '@gny/tracer';
const uint8ArrayFromString = require('uint8arrays/from-string');

function V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle) {
  // step1: node1 -> node2
  const request = async (
    peerId: PeerId,
    blockIdWrapper: BlockIdWrapper,
    span: ISpan
  ): Promise<TracerWrapper<BlockAndVotes>> => {
    const raw: TracerWrapper<BlockIdWrapper> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: blockIdWrapper,
    };

    const data = uint8ArrayFromString(JSON.stringify(raw));

    const resultRaw = await bundle.directRequest(
      peerId,
      global.Config.p2pConfig.V1_NEW_BLOCK_PROTOCOL,
      data
    );

    // TracerWrapper<BlockAndVotes>
    const result: TracerWrapper<BlockAndVotes> = JSON.parse(
      resultRaw.toString()
    );
    if (!isBlockAndVotes(result.data)) {
      throw new Error('[p2p] validation for requested isBlockPropose failed');
    }

    return result;
  };

  // step2: node2 -> node1
  const response = async source => {
    let temp = null;
    for await (const msg of source) {
      temp = msg;
      break;
    }
    const wrapper: TracerWrapper<BlockIdWrapper> = JSON.parse(temp.toString());
    const body = wrapper.data;

    const parentContext = createSpanContextFromSerializedParentContext(
      global.library.tracer,
      wrapper.spanId
    );
    const span = global.library.tracer.startSpan(
      'response to BlockVotes request',
      {
        childOf: parentContext,
      }
    );

    // validate id
    if (!isBlockIdWrapper(body)) {
      global.library.logger.info('[p2p] validaion for blockIdWrapper failed');

      span.setTag('error', true);
      span.log({
        value: '[p2p] validaion for blockIdWrapper failed',
      });
      span.finish();

      throw new Error('validation failed');
    }

    span.log({
      request: body,
    });

    // no need for await
    const newBlock = StateHelper.GetBlockFromLatestBlockCache(body.id);
    if (!newBlock) {
      span.finish();

      const notFoundSpan = global.library.tracer.startSpan(
        'new block not found',
        {
          childOf: span.context(),
        }
      );
      notFoundSpan.log({
        value: `not found: ${body.id}`,
      });
      notFoundSpan.finish();

      throw new Error('New block not found');
    }

    span.setTag('hash', getSmallBlockHash(newBlock.block as IBlock));
    span.setTag('id', newBlock.block.id);
    span.setTag('height', newBlock.block.height);

    span.finish();

    const result: TracerWrapper<BlockAndVotes> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: {
        block: newBlock.block,
        votes: newBlock.votes,
      },
    };

    const converted = [uint8ArrayFromString(JSON.stringify(result))];
    return converted;
  };

  bundle.requestBlockAndVotes = request;
  bundle.directResponse(
    global.Config.p2pConfig.V1_NEW_BLOCK_PROTOCOL,
    response
  );
}

function V1_VOTES_HANDLER(bundle) {
  // not duplex
  // async
  const request = async (peerId: PeerId, votes: ManyVotes, span: ISpan) => {
    const before: TracerWrapper<ManyVotes> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: votes,
    };

    const data = uint8ArrayFromString(JSON.stringify(before));
    await bundle.pushOnly(peerId, global.Config.p2pConfig.V1_VOTES, data);
  };

  // not duplex
  // not async
  const response: SimplePushTypeCallback = (err: Error, values: BufferList) => {
    if (err) {
      console.log(
        'received error while handling error from pushVotes (response)'
      );
      console.error(err);

      return;
    }

    const wrapper: TracerWrapper<ManyVotes> = JSON.parse(values.toString());
    const parentContext = createSpanContextFromSerializedParentContext(
      global.library.tracer,
      wrapper.spanId
    );
    const span = global.library.tracer.startSpan('receive votes', {
      childOf: parentContext,
    });

    const votes: ManyVotes = wrapper.data;

    if (!isManyVotes(votes)) {
      global.library.logger.info(
        `[p2p] validation for ManyVotes failed: ${JSON.stringify(votes)}`
      );

      span.setTag('error', true);
      span.log({
        value: '[p2p] validation for ManyVotes failed',
      });
      span.finish();

      return;
    }

    span.setTag('hash', getSmallBlockHash(votes));
    span.setTag('height', votes.height);
    span.setTag('id', votes.id);

    global.library.logger.info(
      `[p2p] received "${votes.signatures.length}" votes for block: ${
        votes.id
      }, h: ${votes.height}`
    );

    global.library.bus.message('onReceiveVotes', votes, span);
  };

  bundle.pushVotesToPeer = request;
  bundle.handlePushOnly(global.Config.p2pConfig.V1_VOTES, response);
}

function V1_COMMON_BLOCK_HANDLER(bundle) {
  // step1: node1 -> node2
  const request = async (
    peerId: PeerId,
    commonBlockParams: CommonBlockParams,
    span: ISpan
  ): Promise<IBlock> => {
    const raw: TracerWrapper<CommonBlockParams> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: commonBlockParams,
    };
    const data = JSON.stringify(raw);

    const resultRaw = await bundle.directRequest(
      peerId,
      global.Config.p2pConfig.V1_COMMON_BLOCK,
      data
    );
    const result: IBlock = JSON.parse(resultRaw.toString());
    return result;
  };

  const response = async source => {
    let temp = null;
    for await (const msg of source) {
      temp = msg;
      break;
    }
    const raw: TracerWrapper<CommonBlockParams> = JSON.parse(temp.toString());
    const parentContext = createSpanContextFromSerializedParentContext(
      global.library.tracer,
      raw.spanId
    );
    const span = global.library.tracer.startSpan(
      'receive commonBlock request',
      {
        childOf: parentContext,
      }
    );
    span.setTag('syncing', true);

    const body = raw.data;

    if (!isCommonBlockParams(body)) {
      span.setTag('error', true);
      span.log({
        value: 'commonBlock params validation failed',
      });
      span.finish();

      throw new Error('commonBlock params validation failed');
    }

    span.log({
      receivedCommonBlockParams: body,
    });

    // prevent DDOS attack
    const difference = new BigNumber(body.max).minus(body.min).absoluteValue();
    if (difference.isGreaterThanOrEqualTo(10)) {
      throw new Error('too big min,max');
    }

    const max: string = body.max;
    const min: string = body.min;
    const ids: string[] = body.ids;
    try {
      let blocks = await global.app.sdb.getBlocksByHeightRange(min, max);
      if (!blocks || !blocks.length) {
        span.log({
          value: `Blocks not found (between ${min} and ${max})`,
        });
        span.setTag('error', true);
        span.finish();
        throw new Error('Blocks not found');
      }

      span.log({
        value: `found in the db the following values for: min: ${min}, max: ${max} and ids: ${ids.join(
          ', '
        )}`,
      });
      span.log({
        blocks,
      });

      blocks = blocks.reverse();
      let commonBlock: IBlock = null;
      for (const i in ids) {
        if (blocks[i].id === ids[i]) {
          commonBlock = blocks[i];
          break;
        }
      }

      if (!commonBlock) {
        span.log({
          value: 'Common block not found',
        });
        span.finish();
        throw new Error('Common block not found');
      }

      span.log({
        foundCommonBlock: commonBlock,
      });
      span.finish();
      return [uint8ArrayFromString(JSON.stringify(commonBlock))];
    } catch (e) {
      span.setTag('error', true);
      span.log({
        value: '[p2p][requestCommonBlock] Failed to return commonBlock',
      });
      span.log({
        error: e.message,
      });
      span.finish();

      global.app.logger.error(
        '[p2p][requestCommonBlock] Failed to return commonBlock'
      );
      global.app.logger.error(e);

      const result: IBlock = null;
      return [uint8ArrayFromString(JSON.stringify(result))];
    }
  };

  bundle.requestCommonBlock = request;
  bundle.directResponse(global.Config.p2pConfig.V1_COMMON_BLOCK, response);
}

function V1_GET_HEIGH_HANDLER(bundle) {
  const request = async (
    peerId: PeerId,
    parentSpan: ISpan
  ): Promise<HeightWrapper> => {
    const heightSpan = global.library.tracer.startSpan('get height', {
      childOf: parentSpan.context(),
    });

    const raw: TracerWrapper<string> = {
      spanId: serializedSpanContext(
        global.library.tracer,
        heightSpan.context()
      ),
      data: 'no param',
    };
    const data = uint8ArrayFromString(JSON.stringify(raw));

    const resultRaw = await bundle.directRequest(
      peerId,
      global.Config.p2pConfig.V1_GET_HEIGHT,
      data
    );
    const result: HeightWrapper = JSON.parse(resultRaw.toString());

    if (!isHeightWrapper(result)) {
      heightSpan.log({
        log: '[p2p] validation for isHeightWrapper failed',
        got: result,
      });
      heightSpan.setTag('error', true);
      heightSpan.finish();
      throw new Error('[p2p] validation for isHeightWrapper failed');
    }

    heightSpan.log({
      result: result,
    });
    heightSpan.finish();

    return result;
  };

  const response = async source => {
    let temp = null;
    for await (const msg of source) {
      temp = msg;
    }
    const body: TracerWrapper<string> = JSON.parse(temp.toString());

    const span = global.library.tracer.startSpan('receive height request', {
      childOf: createSpanContextFromSerializedParentContext(
        global.library.tracer,
        body.spanId
      ),
    });
    span.setTag('syncing', true);

    const lastBlock = StateHelper.getState().lastBlock;
    const result: HeightWrapper = {
      height: lastBlock.height,
    };

    span.log({
      height: lastBlock.height,
    });

    span.finish();

    const converted = [uint8ArrayFromString(JSON.stringify(result))];
    return converted;
  };

  bundle.requestHeight = request;
  bundle.directResponse(global.Config.p2pConfig.V1_GET_HEIGHT, response);
}

function V1_BLOCKS_HANDLER(bundle) {
  const request = async (
    peerId: PeerId,
    params: BlocksWrapperParams,
    span: ISpan
  ): Promise<IBlock[]> => {
    const raw: TracerWrapper<BlocksWrapperParams> = {
      spanId: serializedSpanContext(global.library.tracer, span.context()),
      data: params,
    };
    const data = JSON.stringify(raw);

    const resultRaw = await bundle.directRequest(
      peerId,
      global.Config.p2pConfig.V1_BLOCKS,
      data
    );

    const result: IBlock[] = JSON.parse(resultRaw.toString());
    return result;
  };

  const response = async source => {
    let temp = null;
    for await (const msg of source) {
      temp = msg;
      break;
    }
    const raw: TracerWrapper<BlocksWrapperParams> = JSON.parse(temp.toString());
    const parentContext = createSpanContextFromSerializedParentContext(
      global.library.tracer,
      raw.spanId
    );
    const span = global.library.tracer.startSpan('receive blocks request', {
      childOf: parentContext,
    });
    span.setTag('syncing', true);

    const body = raw.data;

    body.limit = body.limit || 200;

    if (!isBlocksWrapperParams(body)) {
      span.setTag('error', true);
      span.log({
        value: 'blocksync params validation failed',
      });
      span.finish();

      throw new Error('blocksync params validation failed');
    }

    const blocksLimit: number = body.limit;
    const lastBlockId: string = body.lastBlockId;

    try {
      const lastBlock = await global.app.sdb.getBlockById(lastBlockId);
      if (!lastBlock) {
        const lastBlockNotFoundSpan = global.library.tracer.startSpan(
          'block not found',
          {
            childOf: span.context(),
          }
        );
        lastBlockNotFoundSpan.setTag('error', true);
        lastBlockNotFoundSpan.log({
          value: `Last block not found: ${lastBlockId}`,
        });
        lastBlockNotFoundSpan.finish();
        span.finish();

        throw new Error(`Last block not found: ${lastBlockId}`);
      }

      const minHeight = new BigNumber(lastBlock.height).plus(1).toFixed();
      const maxHeight = new BigNumber(minHeight)
        .plus(blocksLimit)
        .minus(1)
        .toFixed();

      span.log({
        minHeight,
        maxHeight,
      });
      // global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight, true); // better?
      const blocks: IBlock[] = await getBlocksFromApi(
        minHeight,
        maxHeight,
        true
      );

      span.finish();

      return [uint8ArrayFromString(JSON.stringify(blocks))];
    } catch (e) {
      span.setTag('error', true);
      span.log({
        value: '[p2p][requestBlocks] Failed to get blocks with transactions',
      });
      span.log({
        value: `[p2p][requestBlocks] error: ${e.message}`,
      });
      span.finish();

      global.app.logger.error(
        '[p2p][requestBlocks] Failed to get blocks with transactions'
      );
      global.app.logger.error(e);

      const result: IBlock[] = [];
      return [uint8ArrayFromString(JSON.stringify(result))];
    }
  };

  bundle.requestBlocks = request;
  bundle.directResponse(global.Config.p2pConfig.V1_BLOCKS, response);
}

export function attachDirectP2PCommunication(bundle) {
  V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle);
  V1_VOTES_HANDLER(bundle);
  V1_COMMON_BLOCK_HANDLER(bundle);
  V1_GET_HEIGH_HANDLER(bundle);
  V1_BLOCKS_HANDLER(bundle);
}
