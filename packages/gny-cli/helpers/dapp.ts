import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';

import * as cryptoLib from '../lib/crypto';
import * as dappTransactionsLib from '../lib/dapptransactions';
import * as accounts from './account';

function getBytes(block, skipSignature?) {
  debugger;
  const size = 8 + 4 + 4 + 4 + 32 + 32 + 8 + 4 + 4 + 64;

  const bb = new ByteBuffer(size, true);

  bb.writeString(block.prevBlockId || '0');

  bb.writeLong(block.height);
  bb.writeInt(block.timestamp);
  bb.writeInt(block.payloadLength);

  const ph = new Buffer(block.payloadHash, 'hex');
  for (let i = 0; i < ph.length; i++) {
    bb.writeByte(ph[i]);
  }

  const pb = new Buffer(block.delegate, 'hex');
  for (let i = 0; i < pb.length; i++) {
    bb.writeByte(pb[i]);
  }

  bb.writeString(block.pointId || '0');

  bb.writeLong(block.pointHeight || 0);

  bb.writeInt(block.count);

  if (!skipSignature && block.signature) {
    const pb = new Buffer(block.signature, 'hex');
    for (let i = 0; i < pb.length; i++) {
      bb.writeByte(pb[i]);
    }
  }

  bb.flip();
  const b = bb.toBuffer();

  return b;
}

export function neww(genesisAccount, publicKeys, assetInfo) {
  const sender = accounts.account(cryptoLib.generateSecret());

  const block: any = {
    delegate: genesisAccount.keypair.publicKey,
    height: 1,
    pointId: null,
    pointHeight: null,
    transactions: [],
    timestamp: 0,
    payloadLength: 0,
    payloadHash: crypto.createHash('sha256'),
  };

  let bytes: any;

  if (assetInfo) {
    const assetTrs: any = {
      fee: '0',
      timestamp: 0,
      senderPublicKey: sender.keypair.publicKey,
      type: 3,
      args: [
        assetInfo.name,
        String(Number(assetInfo.amount) * Math.pow(10, assetInfo.precision)),
        genesisAccount.address,
      ],
    };
    bytes = dappTransactionsLib.getTransactionBytes(assetTrs);
    assetTrs.signature = cryptoLib.sign(sender.keypair, bytes);
    block.payloadLength += bytes.length;
    block.payloadHash.update(bytes);

    bytes = dappTransactionsLib.getTransactionBytes(assetTrs);
    assetTrs.id = cryptoLib.getId(bytes);
    block.transactions.push(assetTrs);
  }
  block.count = block.transactions.length;

  block.payloadHash = block.payloadHash.digest().toString('hex');
  bytes = getBytes(block);
  block.signature = cryptoLib.sign(genesisAccount.keypair, bytes);
  bytes = getBytes(block);
  block.id = cryptoLib.getId(bytes);

  return block;
}

export default {
  new: neww,
};
