import { V1_NEW_BLOCK_PROTOCOL, Bundle } from '@gny/p2p';
import { joi } from '@gny/extended-joi';
import { StateHelper } from './StateHelper';
import {
  ApiResult,
  NewBlockWrapper,
  BlockIdWrapper,
  BlockAndVotes,
} from '@gny/interfaces';
import * as PeerInfo from 'peer-info';

function V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle: Bundle) {
  const PROTOCOL = V1_NEW_BLOCK_PROTOCOL;

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
  bundle.directResponse(PROTOCOL, response);
}

export function attachDirectP2PCommunication(bundle: Bundle) {
  V1_NEW_BLOCK_PROTOCOL_HANDLER(bundle);
}
