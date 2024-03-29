import * as fs from 'fs';
import * as accountHelper from './account';
import { generateSecret } from '../helpers';
import * as crypto from 'crypto';
import {
  TransactionWebBase,
  BlockWebBase,
  CreateTransactionType,
} from '@gny/web-base';
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

interface DelegateAccount {
  keypair: KeyPair;
  address: string;
  secret: string;
  username: string;
}

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
    signatures: [TransactionWebBase.sign(data.keypair, transaction)],
    secondSignature: undefined,
  };

  if (data.secondKeypair) {
    intermediate.secondSignature = TransactionWebBase.sign(
      data.secondKeypair,
      intermediate
    );
  }

  const final: UnconfirmedTransaction = {
    ...intermediate,
    id: TransactionWebBase.getHash(intermediate).toString('hex'),
  };

  return final;
}

export default function newGenesisBlock(program: any) {
  program
    .command('creategenesis')
    .description('create genesis block')
    .option(
      '-f, --file <file>',
      `genesis accounts balance file. Format:
                            <address><tab><amount><newline>
                            <address><tab>amount><newline>
      `
    )
    .option(
      '-d, --delegates <file>',
      `BIP39 secrets of 101 delegates. Default are 101 delegates. Custom delegates can be max 101, min 21. Format:
                            <delegate_name><tab><BIP39_secret><newline>
                            <delegate_name><tab><BIP39_secret><newline>
                            <delegate_name><tab><BIP39_secret><newline>
      `
    )
    .option(
      '-g, --genesis <account>',
      'BIP39 complient secret. Default is a random genesis account'
    )
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
  let initialAmount = String(400000000 * 1e8);
  if (options.amount) {
    initialAmount = String(options.amount);
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
    options.delegates,
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
  delegatesFile: string,
  intialAmount: string
) {
  let payloadLength = 0;
  const transactions: UnconfirmedTransaction[] = [];
  const payloadHash = crypto.createHash('sha256');

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

  const delegates: DelegateAccount[] = createDelegates(delegatesFile);

  for (let i = 0; i < delegates.length; i++) {
    const one = delegates[i];

    const nameTrs: CreateTransactionTypeWithTimestamp = {
      type: 1,
      timestamp: 0,
      fee: String(0),
      args: [one.username],
      keypair: one.keypair,
    };
    const delegateTrs: CreateTransactionTypeWithTimestamp = {
      type: 10,
      timestamp: 0,
      args: [],
      fee: String(0),
      keypair: one.keypair,
    };

    transactions.push(createTransaction(nameTrs));
    transactions.push(createTransaction(delegateTrs));
  }

  let bytes;

  transactions.forEach(tx => {
    bytes = TransactionWebBase.getBytes(tx);
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
    signature: BlockWebBase.sign(block, sender.keypair),
  };

  const finalBlock: IBlock = {
    ...almostFinalBlock,
    id: BlockWebBase.getId(almostFinalBlock),
  };

  return {
    block: finalBlock,
    delegates: delegates,
  };
}

function createDelegates(delegatesFile?: string) {
  const delegates: DelegateAccount[] = [];

  if (!delegatesFile) {
    for (let i = 0; i < 101; ++i) {
      const delegate = accountHelper.account(generateSecret());

      const username = 'gny_d' + (i + 1);

      // delegate.name = username;
      const finishedDelegate: DelegateAccount = {
        ...delegate,
        username: username,
      };
      delegates.push(finishedDelegate);
    }
  }

  if (delegatesFile) {
    const lines = fs.readFileSync(delegatesFile, 'utf8').split('\n');
    if (lines.length > 101 || lines.length < 21) {
      console.log('delegates count should be >= 21 and <= 101');
      process.exit(1);
    }

    for (const i in lines) {
      const parts = lines[i].split('\t');
      if (parts.length != 2) {
        console.log(JSON.stringify(parts, null, 2));
        console.error('Invalid delegates file format');
        process.exit(1);
      }

      const username = parts[0];
      const secret = parts[1];

      const delegate = accountHelper.account(secret);
      const finishedDelegate: DelegateAccount = {
        ...delegate,
        username: username,
      };
      delegates.push(finishedDelegate);
    }
  }

  return delegates;
}
