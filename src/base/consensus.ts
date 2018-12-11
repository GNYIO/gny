import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import * as assert from 'assert';
import Slots from '../utils/slots';
import * as ip from 'ip';
import { IScope } from '../interfaces';

const slots = new Slots()

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

    return crypto.createHash('sha256').update(byteBuffer.toBuffer()).digest();
  }

  normalizeVotes(votes) {
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
          maxLength: 101, // change to constant variable
        },
      },
      required: ['height', 'id', 'signatures'],
    });
    if (!report) {
      throw Error(this.scope.scheme.getLastError());
    }
    return votes;
  }

  createVotes(keypairs: any, block: any) {
    const hash = this.calculateVoteHash(block.height, block.id);
    const votes = {
      height: block.height,
      id: block.id,
      signatures: [],
    };
    keypairs.forEach((kp) => {
      let privateKeyBuffer = Buffer.from(kp.privateKey, 'hex')
      votes.signatures.push({
        publicKey: kp.publicKey.toString('hex'),
        signature: ed.sign(hash, privateKeyBuffer).toString('hex'),
      })
    })
    return votes
  }

  verifyVote(height: number, id: string, vote: any) {
    try {
      const hash = this.calculateVoteHash(height, id);
      const signature = Buffer.from(vote.signature, 'hex');
      const publicKey = Buffer.from(vote.publicKey, 'hex');
      return ed.verify(hash, signature, publicKey);
    } catch (e) {
      return false;
    }
  }

  addPendingVotes(votes) {
    if (!this.pendingBlock || this.pendingBlock.height !== votes.height
      || this.pendingBlock.id !== votes.id) {
      return this.pendingVotes;
    }
    for (let i = 0; i < votes.signatures.length; ++i) {
      const item = votes.signatures[i];
      if (this.votesKeySet[item.key]) {
        continue;
      }
      if (this.verifyVote(votes.height, votes.id, item)) {
        this.votesKeySet[item.key] = true;
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

  // TODO change 101 to constant variable
  hasEnoughVotes(votes: any) {
    return votes && votes.signatures && (votes.signatures.length > 101 * 2 / 3);
  }

  setPendingBlock(block) {
    this.pendingBlock = block;
  }

  hasPendingBlock(timestamp: any) {
    if (!this.pendingBlock) {
      return false;
    }
    return slots.getSlotNumber(this.pendingBlock.timestamp) === slots.getSlotNumber(timestamp);
  }
  getPendingBlock() {
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
    return crypto.createHash('sha256').update(byteBuffer.toBuffer()).digest();
  }

  createPropose(keypair, block, address) {
    assert(keypair.publicKey.toString('hex') === block.delegate);

    const propose: any = {
      height: block.height,
      id: block.id,
      timestamp: block.timestamp,
      generatorPublicKey: block.delegate,
      address,
    };

    const hash = this.getProposeHash(propose)
    propose.hash = hash.toString('hex')

    let privateKeyBuffer = Buffer.from(keypair.privateKey, 'hex')
    propose.signature = ed.sign(hash, privateKeyBuffer).toString('hex')

    return propose
  }

  getProposeHash(propose) {
    const byteBuffer = new ByteBuffer()
    byteBuffer.writeLong(propose.height)
    byteBuffer.writeString(propose.id)
  
    const generatorPublicKeyBuffer = Buffer.from(propose.generatorPublicKey, 'hex')
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      byteBuffer.writeByte(generatorPublicKeyBuffer[i])
    }
  
    byteBuffer.writeInt(propose.timestamp)
  
    const parts = propose.address.split(':')
    assert(parts.length === 2)
    byteBuffer.writeInt(ip.toLong(parts[0]))
    byteBuffer.writeInt(Number(parts[1]))
  
    byteBuffer.flip()
    return crypto.createHash('sha256').update(byteBuffer.toBuffer()).digest()
  }

  normalizeVotes(votes) {
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
          maxLength: 101,
        },
      },
      required: ['height', 'id', 'signatures'],
    })
    if (!report) {
      throw Error(this.scope.scheme.getLastError())
    }
    return votes
  }

  acceptPropose(propose) {
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

  clearState() {
    this.pendingVotes = undefined;
    this.votesKeySet = new Set();
    this.pendingBlock = undefined;
  }
}
