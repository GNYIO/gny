import {
  V1_NEW_BLOCK_PROTOCOL,
  V1_VOTES,
  Bundle,
  SimplePushTypeCallback,
} from '@gny/p2p';
import { joi } from '@gny/extended-joi';
import { StateHelper } from './StateHelper';
import {
  ApiResult,
  NewBlockWrapper,
  BlockIdWrapper,
  BlockAndVotes,
  ManyVotes,
} from '@gny/interfaces';
import * as PeerInfo from 'peer-info';

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
    const result: BlockAndVotes = JSON.parse(resultRaw.toString());

    return result;
  };

  // step2: node2 -> node1
  const response = async (data: Buffer, cb) => {
    const body = JSON.parse(Buffer.from(data).toString());

    // validate id
    const schema = joi.object().keys({
      id: joi
        .string()
        .hex()
        .required(),
    });
    const report = joi.validate(body, schema);
    if (report.error) {
      return cb(new Error('validation failed'));
    }

    // no need for await
    const newBlock = StateHelper.GetBlockFromLatestBlockCache(body.id);
    if (!newBlock) {
      return cb(new Error('New block not found'));
    }

    const result: ApiResult<NewBlockWrapper> = {
      success: true,
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

    const schema = joi.object().keys({
      height: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      id: joi
        .string()
        .length(64)
        .required(),
      signatures: joi
        .array()
        .items({
          publicKey: joi
            .string()
            .publicKey()
            .required(),
          signature: joi.string().required(),
        })
        .required(),
    });
    const report = joi.validate(votes, schema);
    if (report.error) {
      console.log(report.error.message);
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

export function attachDirectP2PCommunication(bundle: Bundle) {
  V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle);
  V1_VOTES_HANDLER(bundle);
}
