import * as fs from 'fs';
import * as accountHelper from './account';
import * as cryptoLib from './crypto';
import * as crypto from 'crypto';
import { TransactionBase, CreateTransactionType, BlockBase } from '@gny/base';
import {
  KeyPair,
  UnconfirmedTransaction,
  IBlock,
  ITransaction,
} from '@gny/interfaces';

export default function newGenesisBlock(program: any) {
  program
    .command('creategenesis')
    .description('create genesis block')
    .option('-f, --file <file>', 'genesis accounts balance file')
    .option('-d, --delegates <file>', 'BIP39 secrets of 101 delegates')
    .option('-g, --genesis <account>', 'BIP39 complient secret')
    .option(
      '-a, --amount <number>',
      'Initial amount for blockchain; must be have precision of 8'
    )
    .action(genGenesisBlock);
}

function writeFileSync(file, obj) {
  const content = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  fs.writeFileSync(file, content, 'utf8');
}

function appendFileSync(file, obj) {
  const content = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  fs.appendFileSync(file, content, 'utf8');
}

function genGenesisBlock(options) {
  let initialAmount = 100000000 * 1e8;
  if (options.amount) {
    initialAmount = Number(options.amount);
  }

  let genesisAccount: any;
  if (options.genesis) {
    genesisAccount = accountHelper.account(options.genesis);
  } else {
    genesisAccount = accountHelper.account(cryptoLib.generateSecret());
  }
  const newBlockInfo = generateGenesis(
    genesisAccount,
    options.file,
    initialAmount
  );
  const delegateSecrets = newBlockInfo.delegates.map(i => i.secret);
  writeFileSync('./genesisBlock.json', newBlockInfo.block);

  const logFile = './genGenesisBlock.txt';
  writeFileSync(logFile, 'genesis account:\n');
  appendFileSync(logFile, genesisAccount);
  appendFileSync(logFile, '\ndelegates secrets:\n');
  appendFileSync(logFile, delegateSecrets);
  console.log(
    'New genesis block and related account has been created, please see the two file: genesisBlock.json and genGenesisBlock.txt'
  );
}

const sender = accountHelper.account(cryptoLib.generateSecret());

function generateGenesis(genesisAccount, accountsFile: string, intialAmount) {
  let payloadLength = 0;
  const transactions: UnconfirmedTransaction[] = [];
  const payloadHash = crypto.createHash('sha256');
  const totalAmount = 0;
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
      const trs: CreateTransactionType = {
        type: 1,
        fee: String(0),
        args: [Number(amount), parts[0]],
        keypair: {
          publicKey: Buffer.from(sender.keypair.publicKey, 'hex'),
          privateKey: Buffer.from(sender.keypair.privateKey, 'hex'),
        },
      };

      transactions.push(TransactionBase.create(trs));
    }
  } else {
    const balanceTransaction: CreateTransactionType = {
      type: 0,
      fee: String(0),
      args: [intialAmount, genesisAccount.address],
      keypair: {
        publicKey: Buffer.from(sender.keypair.publicKey, 'hex'),
        privateKey: Buffer.from(sender.keypair.privateKey, 'hex'),
      },
    };

    transactions.push(TransactionBase.create(balanceTransaction));
  }

  // make delegates
  for (let i = 0; i < 101; i++) {
    const delegate = accountHelper.account(cryptoLib.generateSecret());

    const username = 'gny_d' + (i + 1);
    interface DelegateAccount {
      keypair: {
        publicKey: string;
        privateKey: string;
      };
      address: string;
      secret: any;
      name: string;
    }

    // delegate.name = username;
    const finishedDelegate: DelegateAccount = {
      ...delegate,
      name: username,
    };
    delegates.push(finishedDelegate);

    const nameTrs: CreateTransactionType = {
      type: 1,
      fee: String(0),
      args: [username],
      keypair: {
        publicKey: Buffer.from(finishedDelegate.keypair.publicKey, 'hex'),
        privateKey: Buffer.from(finishedDelegate.keypair.privateKey, 'hex'),
      },
    };
    const delegateTrs: CreateTransactionType = {
      type: 10,
      args: [],
      fee: String(),
      keypair: {
        publicKey: Buffer.from(finishedDelegate.keypair.publicKey, 'hex'),
        privateKey: Buffer.from(finishedDelegate.keypair.privateKey, 'hex'),
      },
    };

    transactions.push(TransactionBase.create(nameTrs));
    transactions.push(TransactionBase.create(delegateTrs));
  }

  let bytes;

  transactions.forEach(tx => {
    bytes = TransactionBase.getBytes(tx);
    payloadLength += bytes.length;
    payloadHash.update(bytes);
  });

  const finalPayloadHash = payloadHash.digest();

  const block: Pick<
    IBlock,
    | 'version'
    | 'payloadHash'
    | 'timestamp'
    | 'previousBlock'
    | 'delegate'
    | 'transactions'
    | 'height'
    | 'count'
    | 'fees'
    | 'reward'
  > = {
    version: 0,
    payloadHash: finalPayloadHash.toString('hex'),
    timestamp: 0,
    previousBlock: null,
    delegate: sender.keypair.publicKey,
    transactions: transactions.map(x => {
      const fullTrs: ITransaction = {
        ...x,
        height: String(0),
      };
      return fullTrs;
    }),
    height: String(0),
    count: transactions.length,
    fees: String(0),
    reward: String(0),
  };

  // bytes = BlockBase.getBytes(block);
  // BlockBase.sign()
  // block.signature = cryptoLib.sign(sender.keypair, bytes);
  block.signature = BlockBase.sign(block, sender.keypair);
  // block.id =  cryptoLib.getId(bytes);
  block.id = BlockBase.getId(block);

  return {
    block: block,
    delegates: delegates,
  };
}
