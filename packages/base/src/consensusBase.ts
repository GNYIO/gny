import crypto from 'crypto';
import ByteBuffer from 'bytebuffer';
import * as ed from '@gnyio/ed';
import ip from 'ip';
import {
  IBlock,
  KeyPair,
  ManyVotes,
  Signature,
  BlockPropose,
  BlockHeightId,
} from '@gnyio/interfaces';
import { DELEGATES } from '@gnyio/utils';

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
    return ConsensusBase.hasEnoughVotes(votes);
  }

  public static createPropose(
    keypair: KeyPair,
    block: IBlock,
    address: string
  ) {
    if (keypair.publicKey.toString('hex') !== block.delegate) {
      throw new Error('delegate public keys do not match');
    }

    const basePropose: Pick<
      BlockPropose,
      | 'height'
      | 'id'
      | 'prevBlockId'
      | 'timestamp'
      | 'generatorPublicKey'
      | 'address'
    > = {
      height: block.height,
      id: block.id,
      prevBlockId: block.prevBlockId,
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

  // When "hex" encoding is used:
  // Then always a pair get interpreted "7fa5" becomes "7f" and "7e"
  // 7f is 127 in decimal
  // 7e is 127 in decimal
  // 00 is 0 in decimal
  // ff is 255 in decimal
  public static getProposeHash(
    propose: Pick<
      BlockPropose,
      | 'height'
      | 'id'
      | 'prevBlockId'
      | 'generatorPublicKey'
      | 'timestamp'
      | 'address' // correct order
    >
  ) {
    const byteBuffer = new ByteBuffer();
    byteBuffer.writeInt64((propose.height as unknown) as number);
    byteBuffer.writeString(propose.id); // writeUTF8String
    byteBuffer.writeString(propose.prevBlockId); // writeUTF8String

    const generatorPublicKeyBuffer = Buffer.from(
      propose.generatorPublicKey,
      'hex'
    );
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      byteBuffer.writeByte(generatorPublicKeyBuffer[i]); // writeInt8
    }

    byteBuffer.writeInt(propose.timestamp); // writeInt32

    const parts = propose.address.split(':');
    if (parts.length !== 2) {
      throw new Error('something is wrong');
    }

    byteBuffer.writeInt(ip.toLong(parts[0])); // writeInt32
    byteBuffer.writeInt(Number(parts[1])); // writeInt32

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
      hash = ConsensusBase.getProposeHash(propose);
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
