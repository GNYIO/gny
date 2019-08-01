import * as fs from 'fs';
import * as crypto from 'crypto';

import * as cryptoLib from '../lib/crypto';
import * as transactionsLib from '../lib/transactions';
import * as accounts from './account';
import * as ByteBuffer from 'bytebuffer';

const sender = accounts.account(cryptoLib.generateSecret());

export function getBytes(block, skipSignature?) {
  const size = 4 + 4 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 + 64;

  const bb = new ByteBuffer(size, true);
  bb.writeInt(block.version);
  bb.writeInt(block.timestamp);
  bb.writeLong(block.height);
  bb.writeInt(block.count);
  bb.writeLong(block.fees);
  bb.writeLong(block.reward);
  bb.writeString(block.delegate);

  if (block.previousBlock) {
    bb.writeString(block.previousBlock);
  } else {
    bb.writeString('0');
  }

  const payloadHashBuffer = new Buffer(block.payloadHash, 'hex');
  for (let i = 0; i < payloadHashBuffer.length; i++) {
    bb.writeByte(payloadHashBuffer[i]);
  }

  if (!skipSignature && block.signature) {
    const signatureBuffer = new Buffer(block.signature, 'hex');
    for (let i = 0; i < signatureBuffer.length; i++) {
      bb.writeByte(signatureBuffer[i]);
    }
  }

  bb.flip();
  const b = bb.toBuffer();

  return b;
}

export function signTransaction(trs, keypair) {
  let bytes = transactionsLib.getTransactionBytes(trs);
  trs.signatures.push(cryptoLib.sign(sender.keypair, bytes));
  bytes = transactionsLib.getTransactionBytes(trs);
  trs.id = cryptoLib.getId(bytes);
  return trs;
}

export function neww(
  genesisAccount: any,
  dapp: any,
  accountsFile: any,
  intialAmount: any
): any {
  let payloadLength = 0;
  let payloadHash: any = crypto.createHash('sha256');
  const transactions = [];
  // let totalAmount = 0;
  const delegates = [];

  // fund recipient account
  if (accountsFile && fs.existsSync(accountsFile)) {
    const lines = fs.readFileSync(accountsFile, 'utf8').split('\n');
    for (const i in lines) {
      const parts = lines[i].split('\t');
      if (parts.length != 2) {
        console.error('Invalid recipient balance format');
        process.exit(1);
      }
      const amount = String(Number(parts[1]) * 100000000);
      const trs = {
        type: 1,
        fee: 0,
        timestamp: 0,
        senderId: sender.address,
        senderPublicKey: sender.keypair.publicKey,
        signatures: [],
        message: '',
        args: [Number(amount), parts[0]],
      };

      transactions.push(signTransaction(trs, sender.keypair));
    }
  } else {
    const balanceTransaction = {
      type: 0,
      fee: 0,
      timestamp: 0,
      senderId: sender.address,
      senderPublicKey: sender.keypair.publicKey,
      signatures: [],
      message: '',
      args: [intialAmount, genesisAccount.address],
    };

    transactions.push(signTransaction(balanceTransaction, sender.keypair));
  }

  // make delegates
  for (let i = 0; i < 101; i++) {
    const delegate = accounts.account(cryptoLib.generateSecret());

    const username = 'gny_d' + (i + 1);
    delegate['name'] = username;
    delegates.push(delegate);

    const nameTrs = {
      type: 1,
      fee: 0,
      timestamp: 0,
      senderId: delegate.address,
      senderPublicKey: delegate.keypair.publicKey,
      signatures: [],
      args: [username],
      message: '',
    };
    const delegateTrs = {
      type: 10,
      fee: 0,
      timestamp: 0,
      senderId: delegate.address,
      senderPublicKey: delegate.keypair.publicKey,
      signatures: [],
      message: '',
    };

    transactions.push(signTransaction(nameTrs, delegate.keypair));
    transactions.push(signTransaction(delegateTrs, delegate.keypair));
  }

  // make votes
  const delegateNames = delegates.map(function(delegate) {
    return delegate.name;
  });

  const voteTransaction = {
    type: 4,
    fee: 0,
    timestamp: 0,
    senderId: genesisAccount.address,
    senderPublicKey: genesisAccount.keypair.publicKey,
    signatures: [],
    args: [delegateNames.join(',')],
    message: '',
  };

  transactions.forEach(function(tx) {
    const bytes = transactionsLib.getTransactionBytes(tx);
    payloadLength += bytes.length;
    payloadHash.update(bytes);
  });

  payloadHash = payloadHash.digest();

  const block = {
    version: 0,
    payloadHash: payloadHash.toString(),
    timestamp: 0,
    previousBlock: null,
    delegate: sender.keypair.publicKey,
    transactions: transactions,
    height: 0,
    count: transactions.length,
    fees: 0,
    reward: 0,
  };

  let bytes: any = getBytes(block);
  block['signture'] = cryptoLib.sign(sender.keypair, bytes);
  bytes = getBytes(block);
  block['id'] = cryptoLib.getId(bytes);

  return {
    block: block,
    delegates: delegates,
  };
}

export function from(genesisBlock, genesisAccount, dapp) {
  for (const i in genesisBlock.transactions) {
    const tx = genesisBlock.transactions[i];

    if (tx.type == 5) {
      if (tx.asset.dapp.name == dapp.name) {
        throw new Error(
          "DApp with name '" + dapp.name + "' already exists in genesis block"
        );
      }

      if (tx.asset.dapp.git == dapp.git) {
        throw new Error(
          "DApp with git '" + dapp.git + "' already exists in genesis block"
        );
      }

      if (tx.asset.dapp.link == dapp.link) {
        throw new Error(
          "DApp with link '" + dapp.link + "' already exists in genesis block"
        );
      }
    }
  }

  const dappTransaction = {
    type: 5,
    amount: 0,
    fee: 0,
    timestamp: 0,
    senderId: genesisAccount.address,
    senderPublicKey: genesisAccount.keypair.publicKey,
    asset: {
      dapp: dapp,
    },
  };

  let bytes = transactionsLib.getTransactionBytes(dappTransaction);
  dappTransaction['signature'] = cryptoLib.sign(genesisAccount.keypair, bytes);
  bytes = transactionsLib.getTransactionBytes(dappTransaction);
  dappTransaction['id'] = cryptoLib.getId(bytes);

  genesisBlock.payloadLength += bytes.length;
  const payloadHash = crypto
    .createHash('sha256')
    .update(new Buffer(genesisBlock.payloadHash, 'hex'));
  payloadHash.update(bytes);
  genesisBlock.payloadHash = payloadHash.digest().toString('hex');

  genesisBlock.transactions.push(dappTransaction);
  genesisBlock.numberOfTransactions += 1;
  genesisBlock.generatorPublicKey = sender.keypair.publicKey;

  bytes = getBytes(genesisBlock);
  genesisBlock.blockSignature = cryptoLib.sign(sender.keypair, bytes);
  bytes = getBytes(genesisBlock);
  genesisBlock.id = cryptoLib.getId(bytes);

  return {
    block: genesisBlock,
    dapp: dappTransaction,
  };
}

export default {
  getBytes: getBytes,
  new: neww,

  from: from,
};
