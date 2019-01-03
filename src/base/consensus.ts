import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import * as assert from 'assert';
import slots from '../utils/slots';
import * as ip from 'ip';
import { DELEGATES } from '../utils/constants';
import { IScope, KeyPair, ManyVotes, Signature } from '../interfaces';

export class Consensus {
  public pendingBlock: any = null;
  public pendingVotes: any = null;
  public votesKeySet = new Set();
  public scope: IScope;

  constructor(scope: IScope) {
    this.scope = scope;
  }

  private calculateVoteHash(height: number, id: string) {
    const byteBuffer = new ByteBuffer();

    byteBuffer.writeLong(height);
    byteBuffer.writeString(id);
    byteBuffer.flip();

    const buffer = byteBuffer.toBuffer() as Buffer;
    return crypto.createHash('sha256').update(buffer).digest();
  }

  public normalizeVotes = (votes) => {
    const report = this.scope.scheme.validate(votes, {
      type: 'object',
      properties: {
        height: {
          type: 'integer',
        },
        id: {
          type: 'string',
        },
        signatures: {
          type: 'array',
          minLength: 1,
          maxLength: DELEGATES,
        },
      },
      required: ['height', 'id', 'signatures'],
    });
    if (!report) {
      throw Error(this.scope.scheme.getLastError().toString());
    }
    return votes;
  }

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
  }

  public verifyVote = (height: number, id: string, vote: Signature) => {
    try {
      const hash = this.calculateVoteHash(height, id);
      const signature = Buffer.from(vote.signature, 'hex');
      const publicKey = Buffer.from(vote.publicKey, 'hex');
      return ed.verify(hash, signature, publicKey);
    } catch (e) {
      return false;
    }
  }

  public addPendingVotes = (votes) => {
    if (!this.pendingBlock || this.pendingBlock.height !== votes.height
      || this.pendingBlock.id !== votes.id) {
      return this.pendingVotes;
    }
    for (let i = 0; i < votes.signatures.length; ++i) {
      interface Signature {
        publicKey: string;
        signature: string;
      }
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
  }

  public hasEnoughVotes(votes: ManyVotes) {
    return votes && votes.signatures && (votes.signatures.length > DELEGATES * 2 / 3);
  }

  public hasEnoughVotesRemote = (votes) => votes && votes.signatures
  && votes.signatures.length >= 6

  public setPendingBlock(block) {
    this.pendingBlock = block;
  }

  public hasPendingBlock(timestamp: any) {
    if (!this.pendingBlock) {
      return false;
    }
    return slots.getSlotNumber(this.pendingBlock.timestamp) === slots.getSlotNumber(timestamp);
  }
  public getPendingBlock() {
    return this.pendingBlock;
  }

  private calculateProposeHash(propose) {
    const byteBuffer = new ByteBuffer();
    byteBuffer.writeLong(propose.height);
    byteBuffer.writeString(propose.id);

    const generatorPublicKeyBuffer = Buffer.from(propose.generatorPublicKey, 'hex');
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
    }

    byteBuffer.writeInt(propose.timestamp);

    const parts = propose.address.split(':');
    assert(parts.length === 2);
    byteBuffer.writeInt(ip.toLong(parts[0]));
    byteBuffer.writeInt(Number(parts[1]));

    byteBuffer.flip();
    const buffer = byteBuffer.toBuffer() as Buffer;
    return crypto.createHash('sha256').update(buffer).digest();
  }

  public createPropose(keypair: KeyPair, block, address) {
    assert(keypair.publicKey.toString('hex') === block.delegate);

    const propose: any = {
      height: block.height,
      id: block.id,
      timestamp: block.timestamp,
      generatorPublicKey: block.delegate,
      address,
    };

    const hash = this.getProposeHash(propose);
    propose.hash = hash.toString('hex');

    propose.signature = ed.sign(hash, keypair.privateKey).toString('hex');

    return propose;
  }

  private getProposeHash(propose) {
    const byteBuffer = new ByteBuffer();
    byteBuffer.writeLong(propose.height);
    byteBuffer.writeString(propose.id);

    const generatorPublicKeyBuffer = Buffer.from(propose.generatorPublicKey, 'hex');
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
    }

    byteBuffer.writeInt(propose.timestamp);

    const parts = propose.address.split(':');
    assert(parts.length === 2);
    byteBuffer.writeInt(ip.toLong(parts[0]));
    byteBuffer.writeInt(Number(parts[1]));

    byteBuffer.flip();
    const buffer = byteBuffer.toBuffer() as Buffer;
    return crypto.createHash('sha256').update(buffer).digest();
  }

  public acceptPropose(propose) {
    const hash = this.calculateProposeHash(propose);
    if (propose.hash !== hash.toString('hex')) {
      throw Error('Propose hash is not correct.');
    }
    try {
      const signature = Buffer.from(propose.signature, 'hex');
      const publicKey = Buffer.from(propose.generatorPublicKey, 'hex');
      if (ed.verify(hash, signature, publicKey)) {
        return 'Verify propose successful.';
      }
      throw Error('Propose signature verify failed.');
    } catch (e) {
      throw Error(`Propose signature exception: ${e.toString()}`);
    }
  }

  public clearState() {
    this.pendingVotes = undefined;
    this.votesKeySet = new Set();
    this.pendingBlock = undefined;
  }
}
