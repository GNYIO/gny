import * as crypto from 'crypto';
import * as ed from '../utils/ed';
import { IScope, KeyPair, IBlock } from '../interfaces';

export class Block {
  private library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  public calculateFee = () => 10000000;

  private calculateHash = (block: IBlock) => {
    const bytes = this.getBytes(block);
    return crypto
      .createHash('sha256')
      .update(bytes)
      .digest();
  };
}
