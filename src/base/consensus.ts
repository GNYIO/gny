import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import * as assert from 'assert';
import slots from '../utils/slots';
import * as ip from 'ip';
import {
  IScope,
  IBlock,
  KeyPair,
  ManyVotes,
  Signature,
  BlockPropose,
} from '../interfaces';

export class Consensus {
  private pendingBlock: IBlock = undefined;
  private pendingVotes: ManyVotes = undefined;
  private votesKeySet = new Set();
  private library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  public addPendingVotes = (votes: ManyVotes) => {
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
          } as ManyVotes;
        }
        this.pendingVotes.signatures.push(item);
      }
    }
    return this.pendingVotes;
  };

  public setPendingBlock(block: IBlock) {
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

  public createPropose(keypair: KeyPair, block: IBlock, address: string) {
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
