import joi from '../../src/utils/extendedJoi';
import * as crypto from 'crypto';
import * as ed from '../../src/utils/ed';
import { copyObject } from './helpers';
import {
  Transaction,
  Context,
  ManyVotes,
  KeyPair,
  IBlock,
  Signature,
} from '../../src/interfaces';
import slots from '../../src/utils/slots';
import * as ByteBuffer from 'bytebuffer';
import { DELEGATES } from '../utils/constants';

function calculateVoteHash(height: number, id: string) {
  const byteBuffer = new ByteBuffer();

  byteBuffer.writeInt64(height);
  byteBuffer.writeString(id);
  byteBuffer.flip();

  const buffer = byteBuffer.toBuffer();
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest();
}

export function normalizeVotes(old: any): ManyVotes {
  const votes = copyObject(old);

  const schema = joi.object().keys({
    height: joi
      .number()
      .integer()
      .min(0)
      .required(),
    id: joi.string().required(),
    signatures: joi
      .array()
      .items({
        publicKey: joi
          .string()
          .publicKey()
          .required(),
        signature: joi
          .string()
          .signature()
          .required(),
      })
      .required(),
  });
  const report = joi.validate(votes, schema);
  if (report.error) {
    throw new Error(report.error.message);
  }
  return votes;
}

export function createVotes(keypairs: KeyPair[], block: IBlock): ManyVotes {
  const hash = calculateVoteHash(block.height, block.id);
  const votes: ManyVotes = {
    height: block.height,
    id: block.id,
    signatures: [],
  };
  keypairs.forEach((kp: KeyPair) => {
    votes.signatures.push({
      publicKey: kp.publicKey.toString('hex'),
      signature: ed.sign(hash, kp.privateKey).toString('hex'),
    } as Signature);
  });
  return votes;
}

export function verifyVote(height: number, id: string, vote: Signature) {
  try {
    const hash = this.calculateVoteHash(height, id);
    const signature = Buffer.from(vote.signature, 'hex');
    const publicKey = Buffer.from(vote.publicKey, 'hex');
    return ed.verify(hash, signature, publicKey);
  } catch (e) {
    return false;
  }
}

export function hasEnoughVotes(votes: ManyVotes) {
  return (
    votes && votes.signatures && votes.signatures.length > (DELEGATES * 2) / 3
  );
}

export function hasEnoughVotesRemote(votes: ManyVotes) {
  return votes && votes.signatures && votes.signatures.length >= 6;
}
