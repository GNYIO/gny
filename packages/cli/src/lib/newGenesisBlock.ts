import * as fs from 'fs';
import * as accountHelper from './account';
import { generateSecret } from '@gny/utils';
import * as crypto from 'crypto';
import { TransactionBase, BlockBase, CreateTransactionType } from '@gny/base';
import {
  UnconfirmedTransaction,
  IBlock,
  IBlockWithoutId,
  IBlockWithoutSignatureId,
  ITransaction,
  KeyPair,
} from '@gny/interfaces';
import * as addressHelper from '@gny/utils';
import { AccountType } from './account';

type CreateTransactionTypeWithTimestamp = CreateTransactionType & {
  timestamp: number;
};

function createTransaction(data: CreateTransactionTypeWithTimestamp) {
  const transaction: Omit<
    ITransaction,
    'id' | 'signatures' | 'secondSignature' | 'height'
  > = {
    type: data.type,
    senderId: addressHelper.generateAddress(
      data.keypair.publicKey.toString('hex')
    ),
    senderPublicKey: data.keypair.publicKey.toString('hex'),
    timestamp: data.timestamp,
    message: data.message,
    args: data.args,
    fee: data.fee,
  };

  const intermediate: Omit<ITransaction, 'id' | 'height'> = {
    ...transaction,
    signatures: [TransactionBase.sign(data.keypair, transaction)],
    secondSignature: undefined,
  };

  if (data.secondKeypair) {
    intermediate.secondSignature = TransactionBase.sign(
      data.secondKeypair,
      intermediate
    );
  }

  const final: UnconfirmedTransaction = {
    ...intermediate,
    id: TransactionBase.getHash(intermediate).toString('hex'),
  };

  return final;
}

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

  let genesisAccount: AccountType;
  if (options.genesis) {
    genesisAccount = accountHelper.account(options.genesis);
  } else {
    genesisAccount = accountHelper.account(generateSecret());
  }
  const newBlockInfo = generateGenesis(
    genesisAccount,
    options.file,
    initialAmount
  );
  const delegateSecrets = newBlockInfo.delegates.map(i => i.secret);
  writeFileSync('./genesisBlock.json', newBlockInfo.block);

  const prettyGenesisAccount = {
    ...genesisAccount,
    keypair: {
      privateKey: genesisAccount.keypair.privateKey.toString('hex'),
      publicKey: genesisAccount.keypair.publicKey.toString('hex'),
    },
  };
  const logFile = './genGenesisBlock.txt';
  writeFileSync(logFile, 'genesis account:\n');
  appendFileSync(logFile, prettyGenesisAccount);
  appendFileSync(logFile, '\ndelegates secrets:\n');
  appendFileSync(logFile, delegateSecrets);
  console.log(
    'New genesis block and related account has been created, please see the two file: genesisBlock.json and genGenesisBlock.txt'
  );
}

const sender = accountHelper.account(generateSecret());

function generateGenesis(
  genesisAccount: AccountType,
  accountsFile: string,
  intialAmount
) {
  let payloadLength = 0;
  const transactions: UnconfirmedTransaction[] = [];
  const payloadHash = crypto.createHash('sha256');
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
      const trs: CreateTransactionTypeWithTimestamp = {
        type: 1,
        timestamp: 0,
        fee: String(0),
        args: [Number(amount), parts[0]],
        keypair: sender.keypair,
      };

      transactions.push(createTransaction(trs));
    }
  } else {
    const balanceTransaction: CreateTransactionTypeWithTimestamp = {
      type: 0,
      timestamp: 0,
      fee: String(0),
      args: [intialAmount, genesisAccount.address],
      keypair: sender.keypair,
    };

    transactions.push(createTransaction(balanceTransaction));
  }

  // make delegates
  for (let i = 0; i < 101; i++) {
    const delegate = accountHelper.account(generateSecret());

    const username = 'gny_d' + (i + 1);
    interface DelegateAccount {
      keypair: KeyPair;
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

    const nameTrs: CreateTransactionTypeWithTimestamp = {
      type: 1,
      timestamp: 0,
      fee: String(0),
      args: [username],
      keypair: finishedDelegate.keypair,
    };
    const delegateTrs: CreateTransactionTypeWithTimestamp = {
      type: 10,
      timestamp: 0,
      args: [],
      fee: String(0),
      keypair: finishedDelegate.keypair,
    };

    transactions.push(createTransaction(nameTrs));
    transactions.push(createTransaction(delegateTrs));
  }

  let bytes;

  transactions.forEach(tx => {
    bytes = TransactionBase.getBytes(tx);
    payloadLength += bytes.length;
    payloadHash.update(bytes);
  });

  const finalPayloadHash = payloadHash.digest();

  const block: IBlockWithoutSignatureId = {
    version: 0,
    prevBlockId: null,
    payloadHash: finalPayloadHash.toString('hex'),
    timestamp: 0,
    delegate: sender.keypair.publicKey.toString('hex'),
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

  const almostFinalBlock: IBlockWithoutId = {
    ...block,
    signature: BlockBase.sign(block, sender.keypair),
  };

  const finalBlock: IBlock = {
    ...almostFinalBlock,
    id: BlockBase.getId(almostFinalBlock),
  };

  return {
    block: finalBlock,
    delegates: delegates,
  };
}
