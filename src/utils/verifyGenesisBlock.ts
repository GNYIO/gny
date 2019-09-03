import * as assert from 'assert';
import * as crypto from 'crypto';
import { TransactionBase } from '../base/transaction';
import { BlockBase } from '../base/block';
import { IGenesisBlock } from '../../packages/interfaces';

export function verifyGenesisBlock(block: IGenesisBlock) {
  try {
    const payloadHash = crypto.createHash('sha256');

    for (let i = 0; i < block.transactions.length; i++) {
      const trs = block.transactions[i];
      const bytes = TransactionBase.getBytes(trs);
      payloadHash.update(bytes);
    }
    const id = BlockBase.getId(block);
    assert.equal(
      payloadHash.digest().toString('hex'),
      block.payloadHash,
      'Unexpected payloadHash'
    );
    assert.equal(id, block.id, 'Unexpected block id');
  } catch (e) {
    throw e;
  }
}
