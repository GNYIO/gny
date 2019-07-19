import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import * as assert from 'assert';
import joi from '../../src/utils/extendedJoi';
import * as ip from 'ip';
import {
  IBlock,
  KeyPair,
  ManyVotes,
  Signature,
  BlockPropose,
  BlockHeightId,
} from '../interfaces';
import { DELEGATES } from '../utils/constants';

export class ConsensusBase {
  private static calculateVoteHash(height: string, id: string) {
    const byteBuffer = new ByteBuffer();

    byteBuffer.writeInt64((height as unknown) as number);
    byteBuffer.writeString(id);
    byteBuffer.flip();

    const buffer = byteBuffer.toBuffer();
    return crypto
      .createHash('sha256')
      .update(buffer)
      .digest();
  }

  public static normalizeVotes(votes: any): ManyVotes {
    const schema = joi.object().keys({
      height: joi
        .string()
        .positiveOrZeroBigInt()
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

  public static createVotes(keypairs: KeyPair[], heightAndId: BlockHeightId) {
    const hash = ConsensusBase.calculateVoteHash(
      heightAndId.height,
      heightAndId.id
    );
    const votes: ManyVotes = {
      height: heightAndId.height,
      id: heightAndId.id,
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

  public static verifyVote(height: string, id: string, vote: Signature) {
    try {
      const hash = ConsensusBase.calculateVoteHash(height, id);
      const signature = Buffer.from(vote.signature, 'hex');
      const publicKey = Buffer.from(vote.publicKey, 'hex');
      return ed.verify(hash, signature, publicKey);
    } catch (e) {
      return false;
    }
  }

  public static hasEnoughVotes(votes: ManyVotes) {
    return (
      votes && votes.signatures && votes.signatures.length > (DELEGATES * 2) / 3
    );
  }

  public static hasEnoughVotesRemote(votes: ManyVotes) {
    return votes && votes.signatures && votes.signatures.length >= 6;
  }

  private static calculateProposeHash(propose: BlockPropose) {
    const byteBuffer = new ByteBuffer();
    byteBuffer.writeInt64((propose.height as unknown) as number);
    byteBuffer.writeString(propose.id);

    const generatorPublicKeyBuffer = Buffer.from(
      propose.generatorPublicKey,
      'hex'
    );
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
    }

    byteBuffer.writeInt(propose.timestamp);

    const parts = propose.address.split(':');
    assert(parts.length === 2);
    byteBuffer.writeInt(ip.toLong(parts[0]));
    byteBuffer.writeInt(Number(parts[1]));

    byteBuffer.flip();
    const buffer = byteBuffer.toBuffer();
    return crypto
      .createHash('sha256')
      .update(buffer)
      .digest();
  }

  public static createPropose(
    keypair: KeyPair,
    block: IBlock,
    address: string
  ) {
    assert(
      keypair.publicKey.toString('hex') === block.delegate,
      'delegate public keys do not match'
    );

    const basePropose: Pick<
      BlockPropose,
      'height' | 'id' | 'timestamp' | 'generatorPublicKey' | 'address'
    > = {
      height: block.height,
      id: block.id,
      timestamp: block.timestamp,
      generatorPublicKey: block.delegate,
      address,
    };

    const hash = ConsensusBase.getProposeHash(basePropose);

    const finalPropose: BlockPropose = {
      ...basePropose,
      hash: hash.toString('hex'),
      signature: ed.sign(hash, keypair.privateKey).toString('hex'),
    };

    return finalPropose;
  }

  private static getProposeHash(
    propose: Pick<
      BlockPropose,
      'height' | 'id' | 'timestamp' | 'generatorPublicKey' | 'address'
    >
  ) {
    const byteBuffer = new ByteBuffer();
    byteBuffer.writeInt64((propose.height as unknown) as number);
    byteBuffer.writeString(propose.id);

    const generatorPublicKeyBuffer = Buffer.from(
      propose.generatorPublicKey,
      'hex'
    );
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
    }

    byteBuffer.writeInt(propose.timestamp);

    const parts = propose.address.split(':');
    assert(parts.length === 2);
    byteBuffer.writeInt(ip.toLong(parts[0]));
    byteBuffer.writeInt(Number(parts[1]));

    byteBuffer.flip();
    const buffer = byteBuffer.toBuffer();
    return crypto
      .createHash('sha256')
      .update(buffer)
      .digest();
  }

  public static acceptPropose(propose: BlockPropose) {
    let hash: Buffer;
    try {
      hash = ConsensusBase.calculateProposeHash(propose);
    } catch (err) {
      return false;
    }
    if (propose.hash !== hash.toString('hex')) {
      return false;
    }
    try {
      const signature = Buffer.from(propose.signature, 'hex');
      const publicKey = Buffer.from(propose.generatorPublicKey, 'hex');
      if (ed.verify(hash, signature, publicKey)) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
