import * as p2p from '@gnyio/p2p';
import { StateHelper } from './StateHelper.js';
import {
  BlockIdWrapper,
  BlockAndVotes,
  ManyVotes,
  IBlock,
  CommonBlockParams,
  HeightWrapper,
  BlocksWrapperParams,
  BufferList,
  CommonBlockResult,
  TracerWrapper,
} from '@gnyio/interfaces';
import {
  isCommonBlockParams,
  isBlocksWrapperParams,
  isBlockAndVotes,
  isManyVotes,
  isHeightWrapper,
  isBlockIdWrapper,
  isCommonBlockResult,
  isSimplePeerInfoArray,
  isTracerWrapper,
} from '@gnyio/type-validation';
import BigNumber from 'bignumber.js';
import * as PeerId from 'peer-id';
import { getSmallBlockHash } from '@gnyio/tracer';

import { getBlocks as getBlocksFromApi } from '../http/util.js';
import {
  ISpan,
  serializedSpanContext,
  createSpanContextFromSerializedParentContext,
} from '@gnyio/tracer';
import uint8Arrays from 'uint8arrays';
import first from 'it-first';

function V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle) {
  // step1: node1 -> node2

  // step2: node2 -> node1
  async function response(source) {
    const temp = await first(source);
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
    if (!isTracerWrapper(wrapper) || !isBlockIdWrapper(body)) {
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

    const converted = [uint8Arrays.fromString(JSON.stringify(result))];
    return converted;
  }

  bundle.directResponse(
    global.Config.p2pConfig.V1_NEW_BLOCK_PROTOCOL,
    response
  );
}

function V1_VOTES_HANDLER(bundle) {
  // not duplex
  // not async
  const response: p2p.SimplePushTypeCallback = async function response(
    err: Error,
    values: BufferList
  ) {
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

    if (!isTracerWrapper(wrapper) || !isManyVotes(votes)) {
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

  bundle.handlePushOnly(global.Config.p2pConfig.V1_VOTES, response);
}

function V1_COMMON_BLOCK_HANDLER(bundle) {
  async function response(source) {
    const temp = await first(source);

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

    if (!isTracerWrapper(raw) || !isCommonBlockParams(body)) {
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
      global.app.logger.info(
        `found in the db the following values for: min: ${min}, max: ${max} and ids: ${ids.join(
          ', '
        )}`
      );
      span.log({
        blocks,
      });
      global.app.logger.info(JSON.stringify(blocks));

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

      const currentHeight = StateHelper.getState().lastBlock.height;
      const currentBlock = await global.app.sdb.getBlockByHeight(
        currentHeight,
        false
      );
      if (new BigNumber(currentBlock.height).isEqualTo(0)) {
        currentBlock.prevBlockId = null;
      }
      const result: CommonBlockResult = {
        commonBlock,
        currentBlock,
      };

      return [uint8Arrays.fromString(JSON.stringify(result))];
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

      const result: CommonBlockResult = null;
      return [uint8Arrays.fromString(JSON.stringify(result))];
    }
  }

  bundle.directResponse(global.Config.p2pConfig.V1_COMMON_BLOCK, response);
}

function V1_GET_HEIGH_HANDLER(bundle) {
  async function response(source) {
    const temp = await first(source);

    const body: TracerWrapper<string> = JSON.parse(temp.toString());

    if (!isTracerWrapper(body)) {
      throw new Error('[p2p] validation for getHeight isTracerWrapper failed');
    }

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

    const converted = [uint8Arrays.fromString(JSON.stringify(result))];
    return converted;
  }

  bundle.directResponse(global.Config.p2pConfig.V1_GET_HEIGHT, response);
}

function V1_BLOCKS_HANDLER(bundle) {
  async function response(source) {
    const temp = await first(source);

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

    if (!isTracerWrapper(raw) || !isBlocksWrapperParams(body)) {
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

      return [uint8Arrays.fromString(JSON.stringify(blocks))];
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
      return [uint8Arrays.fromString(JSON.stringify(result))];
    }
  }

  bundle.directResponse(global.Config.p2pConfig.V1_BLOCKS, response);
}

function V1_GET_PEERS_HANDLER(bundle) {
  async function response(source) {
    const temp = await first(source);

    const raw = JSON.parse(temp.toString());
    const parentContext = createSpanContextFromSerializedParentContext(
      global.library.tracer,
      raw
    );

    const span = global.library.tracer.startSpan('receive get peers request', {
      childOf: parentContext,
    });

    const peers = bundle.getAllConnectedPeersPeerInfo();

    span.log({
      peers,
    });
    span.finish();

    return [uint8Arrays.fromString(JSON.stringify(peers))];
  }

  bundle.directResponse(global.Config.p2pConfig.V1_GET_PEERS, response);
}

export function attachDirectP2PCommunication(bundle) {
  V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle);
  V1_VOTES_HANDLER(bundle);
  V1_COMMON_BLOCK_HANDLER(bundle);
  V1_GET_HEIGH_HANDLER(bundle);
  V1_BLOCKS_HANDLER(bundle);
  V1_GET_PEERS_HANDLER(bundle);
}
