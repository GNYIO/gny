import * as assert from 'assert';
import * as crypto from 'crypto';
import { TransactionBase } from '@gny/base';
import { BlockBase } from '@gny/base';
import { IBlock } from '@gny/interfaces';

export function verifyGenesisBlock(genesisBlock: IBlock) {
  try {
    const payloadHash = crypto.createHash('sha256');

    for (let i = 0; i < genesisBlock.transactions.length; i++) {
      const trs = genesisBlock.transactions[i];
      const bytes = TransactionBase.getBytes(trs);
      payloadHash.update(bytes);
    }
    const id = BlockBase.getId(genesisBlock);
    assert.equal(
      payloadHash.digest().toString('hex'),
      genesisBlock.payloadHash,
      'Unexpected payloadHash'
    );
    assert.equal(id, genesisBlock.id, 'Unexpected block id');
  } catch (e) {
    throw e;
  }
}
