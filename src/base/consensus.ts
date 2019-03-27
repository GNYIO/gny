import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import * as assert from 'assert';
import slots from '../utils/slots';
import * as ip from 'ip';
import { DELEGATES } from '../utils/constants';
import {
  IScope,
  KeyPair,
  ManyVotes,
  Signature,
  BlockPropose,
} from '../interfaces';

export class Consensus {
  private pendingBlock: any = null;
  private pendingVotes: any = null;
  private votesKeySet = new Set();
  private library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  private calculateVoteHash(height: number, id: string) {
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

  public normalizeVotes = (votes): ManyVotes => {
    const schema = this.library.joi.object().keys({
      height: this.library.joi
        .number()
        .integer()
        .min(0)
        .required(),
      id: this.library.joi.string().required(),
      signatures: this.library.joi
        .array()
        .items({
          publicKey: this.library.joi
            .string()
            .publicKey()
            .required(),
          signature: this.library.joi
            .string()
            .signature()
            .required(),
        })
        .required(),
    });
    const report = this.library.joi.validate(votes, schema);
    if (report.error) {
      throw new Error(report.error.message);
    }
    return votes;
  };

  public createVotes = (keypairs: KeyPair[], block: any): ManyVotes => {
    const hash = this.calculateVoteHash(block.height, block.id);
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
  };

  public verifyVote = (height: number, id: string, vote: Signature) => {
    try {
      const hash = this.calculateVoteHash(height, id);
      const signature = Buffer.from(vote.signature, 'hex');
      const publicKey = Buffer.from(vote.publicKey, 'hex');
      return ed.verify(hash, signature, publicKey);
    } catch (e) {
      return false;
    }
  };

  public addPendingVotes = votes => {
    if (
      !this.pendingBlock ||
      this.pendingBlock.height !== votes.height ||
      this.pendingBlock.id !== votes.id
    ) {
      return this.pendingVotes;
    }
    for (let i = 0; i < votes.signatures.length; ++i) {
      const item = votes.signatures[i];
      if (this.votesKeySet[item.publicKey]) {
        continue;
      }
      if (this.verifyVote(votes.height, votes.id, item)) {
        this.votesKeySet[item.publicKey] = true;
        if (!this.pendingVotes) {
          this.pendingVotes = {
            height: votes.height,
            id: votes.id,
            signatures: [],
          };
        }
        this.pendingVotes.signatures.push(item);
      }
    }
    return this.pendingVotes;
  };

  public hasEnoughVotes(votes: ManyVotes) {
    return (
      votes && votes.signatures && votes.signatures.length > (DELEGATES * 2) / 3
    );
  }

  public hasEnoughVotesRemote = votes =>
    votes && votes.signatures && votes.signatures.length >= 6;

  public setPendingBlock(block) {
    this.pendingBlock = block;
  }

  public hasPendingBlock(timestamp: number) {
    if (!this.pendingBlock) {
      return false;
    }
    return (
      slots.getSlotNumber(this.pendingBlock.timestamp) ===
      slots.getSlotNumber(timestamp)
    );
  }
  public getPendingBlock() {
    return this.pendingBlock;
  }

  private calculateProposeHash(propose: BlockPropose) {
    const byteBuffer = new ByteBuffer();
    byteBuffer.writeInt64(propose.height);
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

  public createPropose(keypair: KeyPair, block, address: string) {
    assert(keypair.publicKey.toString('hex') === block.delegate);

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

    const hash = this.getProposeHash(basePropose);

    const finalPropose: BlockPropose = {
      ...basePropose,
      hash: hash.toString('hex'),
      signature: ed.sign(hash, keypair.privateKey).toString('hex'),
    };

    return finalPropose;
  }

  private getProposeHash(
    propose: Pick<
      BlockPropose,
      'height' | 'id' | 'timestamp' | 'generatorPublicKey' | 'address'
    >
  ) {
    const byteBuffer = new ByteBuffer();
    byteBuffer.writeInt64(propose.height);
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

  public acceptPropose(propose: BlockPropose) {
    const hash = this.calculateProposeHash(propose);
    if (propose.hash !== hash.toString('hex')) {
      throw new Error('Propose hash is not correct.');
    }
    try {
      const signature = Buffer.from(propose.signature, 'hex');
      const publicKey = Buffer.from(propose.generatorPublicKey, 'hex');
      if (ed.verify(hash, signature, publicKey)) {
        return 'Verify propose successful.';
      }
      throw new Error('Propose signature verify failed.');
    } catch (e) {
      throw new Error(`Propose signature exception: ${e.toString()}`);
    }
  }

  public clearState() {
    this.pendingVotes = undefined;
    this.votesKeySet = new Set();
    this.pendingBlock = undefined;
  }
}
