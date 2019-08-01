import * as fs from 'fs';
import * as crypto from 'crypto';

// import * as gnyJS from '../../../packages/gny-js';
import * as gnyJS from '@gny/gny-js';
import Api from '../helpers/api';
import * as blockHelper from '../helpers/block';
import * as cryptoLib from '../lib/crypto';

let globalOptions;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
    mainnet: !!globalOptions.main,
  });
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

function openAccount(secret) {
  getApi().post('/api/accounts/open', { secret: secret }, function(
    err,
    result
  ) {
    console.log(err || pretty(result.account));
  });
}

function openAccountByPublicKey(publicKey) {
  getApi().post('/api/accounts/open2', { publicKey: publicKey }, function(
    err,
    result
  ) {
    console.log(err || pretty(result.account));
  });
}

function getHeight() {
  getApi().get('/api/blocks/getHeight', function(err, result) {
    console.log(err || result.height);
  });
}

function getBlockStatus() {
  getApi().get('/api/blocks/getStatus', function(err, result) {
    console.log(err || pretty(result));
  });
}

function getBalance(address) {
  const params = { address: address };
  getApi().get('/api/accounts/getBalance', params, function(err, result) {
    console.log(err || result.balances);
  });
}

function getAccount(address) {
  const params = { address: address };
  getApi().get('/api/accounts/', params, function(err, result) {
    console.log(err || pretty(result));
  });
}

function getVotedDelegates(address, options) {
  const params = {
    address: address,
    limit: options.limit,
    offset: options.offset,
  };
  getApi().get('/api/accounts/delegates', params, function(err, result) {
    console.log(err || result);
  });
}

function getDelegates(options) {
  const params = {
    limit: options.limit,
    offset: options.offset,
    orderBy: options.sort || 'rate:asc',
  };
  getApi().get('/api/delegates/', params, function(err, result) {
    console.log(err || pretty(result.delegates));
  });
}

function getDelegatesCount() {
  getApi().get('/api/delegates/count', function(err, result) {
    console.log(err || result.count);
  });
}

function getVoters(publicKey) {
  const params = { publicKey: publicKey };
  getApi().get('/api/delegates/voters', params, function(err, result) {
    console.log(err || pretty(result.accounts));
  });
}

function getDelegateByPublicKey(publicKey) {
  const params = { publicKey: publicKey };
  getApi().get('/api/delegates/get', params, function(err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getDelegateByUsername(username) {
  const params = { username: username };
  getApi().get('/api/delegates/get', params, function(err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getBlocks(options) {
  const params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    totalAmount: options.totalAmount,
    totalFee: options.totalFee,
    reward: options.reward,
    generatorPublicKey: options.generatorPublicKey,
  };
  getApi().get('/api/blocks/', params, function(err, result) {
    console.log(err || pretty(result));
  });
}

function getBlockById(id) {
  const params = { id: id };
  getApi().get('/api/blocks/get', params, function(err, result) {
    console.log(err || pretty(result.block));
  });
}

function getBlockByHeight(height) {
  const params = { height: height };
  getApi().get('/api/blocks/get', params, function(err, result) {
    console.log(err || pretty(result.block));
  });
}

function getPeers(options) {
  const params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    state: options.state,
    os: options.os,
    port: options.port,
    version: options.version,
  };
  // var liskOptions = {host:'login.lisk.io', port:80};
  getApi().get('/api/peers/', params, function(err, result) {
    console.log(err || pretty(result.peers));
  });
}

function getUnconfirmedTransactions(options) {
  const params = {
    senderPublicKey: options.key,
    address: options.address,
  };
  getApi().get('/api/transactions/unconfirmed', params, function(err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getTransactions(options) {
  const params = {
    blockId: options.blockId,
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    type: options.type,
    senderPublicKey: options.senderPublicKey,
    senderId: options.senderId,
    recipientId: options.recipientId,
    amount: options.amount,
    fee: options.fee,
    message: options.message,
  };
  getApi().get('/api/transactions/', params, function(err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getTransaction(id) {
  const params = { id: id };
  getApi().get('/api/transactions/get', params, function(err, result) {
    console.log(err || pretty(result.transaction));
  });
}

function sendMoney(options) {
  // var params = {
  //   secret: options.secret,
  //   secondSecret: options.secondSecret,
  //   recipientId: options.to,
  //   amount: Number(options.amount)
  // };
  // getApi().put('/api/transactions/', params, function (err, result) {
  //   console.log(err || result);
  // });
  const trs = gnyJS.transaction.createTransactionEx({
    type: 1,
    fee: Number(options.fee) || 10000000,
    message: options.message,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: [options.amount, options.to],
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function sendAsset(options) {
  const trs = gnyJS.uia.createTransfer(
    options.currency,
    options.amount,
    options.to,
    options.message,
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function registerDelegate(options) {
  // var params = {
  //   secret: options.secret,
  //   username: options.username,
  //   secondSecret: options.secondSecret,
  // };
  // getApi().put('/api/delegates/', params, function (err, result) {
  //   console.log(err || result);
  // });
  const trs = gnyJS.delegate.createDelegate(
    options.username,
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function vote(secret, publicKeys, op, secondSecret) {
  const votes = publicKeys.split(',').map(function(el) {
    return op + el;
  });
  const trs = gnyJS.vote.createVote(votes, secret, secondSecret);
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function listdiffvotes(options) {
  const params = { username: options.username };
  getApi().get('/api/delegates/get', params, function(err, result) {
    const publicKey = result.delegate.publicKey;
    const params = {
      address: result.delegate.address,
      limit: options.limit || 101,
      offset: options.offset || 0,
    };
    getApi().get('/api/accounts/delegates', params, function(err, result) {
      const names_a = [];
      for (let i = 0; i < result.delegates.length; ++i) {
        names_a[i] = result.delegates[i].username;
      }
      const a = new Set(names_a);
      const params = { publicKey: publicKey };
      getApi().get('/api/delegates/voters', params, function(err, result) {
        const names_b = [];
        for (let i = 0; i < result.accounts.length; ++i) {
          names_b[i] = result.accounts[i].username;
        }
        const b = new Set(names_b);
        const diffab = [...a].filter(x => !b.has(x));
        const diffba = [...b].filter(x => !a.has(x));
        console.log(
          "you voted but doesn't vote you: \n\t",
          JSON.stringify(diffab)
        );
        console.log(
          "\nvoted you but you don't voted: \n\t",
          JSON.stringify(diffba)
        );
      });
    });
  });
}

function upvote(options) {
  vote(options.secret, options.publicKeys, '+', options.secondSecret);
}

function downvote(options) {
  vote(options.secret, options.publicKeys, '-', options.secondSecret);
}

function setSecondSecret(options) {
  const trs = gnyJS.basic.setSecondSecret(options.secret, options.secondSecret);
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function registerChain(options) {
  if (!options.metafile || !fs.existsSync(options.metafile)) {
    console.error('Error: invalid params, dapp meta file must exists');
    return;
  }
  const dapp = JSON.parse(fs.readFileSync(options.metafile, 'utf8'));
  const trs = gnyJS.transaction.createTransactionEx({
    type: 200,
    fee: 100 * 100000000,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: [
      dapp.name,
      dapp.desc,
      dapp.link,
      dapp.icon,
      dapp.delegates,
      dapp.unlockDelegates,
    ],
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function deposit(options) {
  const trs = gnyJS.transfer.createInTransfer(
    options.dapp,
    options.currency,
    options.amount,
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function dappTransaction(options) {
  trs = gnyJS.dapp.createInnerTransaction(
    {
      fee: options.fee,
      type: Number(options.type),
      args: JSON.parse(options.args),
    },
    options.secret
  );
  getApi().put(
    '/api/dapps/' + options.dapp + '/transactions/signed',
    { transaction: trs },
    function(err, result) {
      console.log(err || result.transactionId);
    }
  );
}

function transaction(options) {
  const trs = gnyJS.transaction.createTransactionEx({
    type: Number(options.type),
    fee: Number(options.fee) || 10000000,
    message: options.message,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: JSON.parse(options.args),
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function lock(options) {
  const trs = gnyJS.transaction.createLock(
    options.height,
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function getFullBlockById(id) {
  getApi().get('/api/blocks/full?id=' + id, function(err, result) {
    console.log(err || pretty(result.block));
  });
}

function getFullBlockByHeight(height) {
  getApi().get('/api/blocks/full?height=' + height, function(err, result) {
    console.log(err || pretty(result.block));
  });
}

function getTransactionBytes(options: any) {
  try {
    const trs = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(gnyJS.crypto.getBytes(trs, true, true).toString('hex'));
}

function getTransactionId(options) {
  try {
    const trs = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(gnyJS.crypto.getId(trs));
}

function getBlockPayloadHash(options) {
  try {
    const block = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  const payloadHash = crypto.createHash('sha256');
  for (let i = 0; i < block.transactions.length; ++i) {
    payloadHash.update(gnyJS.crypto.getBytes(block.transactions[i]));
  }
  console.log(payloadHash.digest().toString('hex'));
}

function getBlockBytes(options) {
  try {
    const block = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(blockHelper.getBytes(block, true).toString('hex'));
}

function getBlockId(options) {
  try {
    const block = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  const bytes = blockHelper.getBytes(block);
  console.log(cryptoLib.getId(bytes));
}

function verifyBytes(options) {
  console.log(
    gnyJS.crypto.verifyBytes(
      options.bytes,
      options.signature,
      options.publicKey
    )
  );
}

export default function api(program) {
  globalOptions = program;

  program
    .command('getheight')
    .description('get block height')
    .action(getHeight);

  program
    .command('getblockstatus')
    .description('get block status')
    .action(getBlockStatus);

  program
    .command('openaccount [secret]')
    .description('open your account and get the infomation by secret')
    .action(openAccount);

  program
    .command('openaccountbypublickey [publickey]')
    .description('open your account and get the infomation by publickey')
    .action(openAccountByPublicKey);

  program
    .command('getbalance [address]')
    .description('get balance by address')
    .action(getBalance);

  program
    .command('getaccount [address]')
    .description('get account by address')
    .action(getAccount);

  program
    .command('getvoteddelegates [address]')
    .description('get delegates voted by address')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getVotedDelegates);

  program
    .command('getdelegatescount')
    .description('get delegates count')
    .action(getDelegatesCount);

  program
    .command('getdelegates')
    .description('get delegates')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-s, --sort <field:mode>', 'rate:asc, vote:desc, ...')
    .action(getDelegates);

  program
    .command('getvoters [publicKey]')
    .description('get voters of a delegate by public key')
    .action(getVoters);

  program
    .command('getdelegatebypublickey [publicKey]')
    .description('get delegate by public key')
    .action(getDelegateByPublicKey);

  program
    .command('getdelegatebyusername [username]')
    .description('get delegate by username')
    .action(getDelegateByUsername);

  program
    .command('getblocks')
    .description('get blocks')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-r, --reward <n>', '')
    .option('-f, --totalFee <n>', '')
    .option('-a, --totalAmount <n>', '')
    .option('-g, --generatorPublicKey <publicKey>', '')
    .option(
      '-s, --sort <field:mode>',
      'height:asc, totalAmount:asc, totalFee:asc'
    )
    .action(getBlocks);

  program
    .command('getblockbyid [id]')
    .description('get block by id')
    .action(getBlockById);

  program
    .command('getblockbyheight [height]')
    .description('get block by height')
    .action(getBlockByHeight);

  program
    .command('getpeers')
    .description('get peers')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-t, --state <n>', ' 0 ~ 3')
    .option('-s, --sort <field:mode>', '')
    .option('-v, --version <version>', '')
    .option('-p, --port <n>', '')
    .option('--os <os>', '')
    .action(getPeers);

  program
    .command('getunconfirmedtransactions')
    .description('get unconfirmed transactions')
    .option('-k, --key <sender public key>', '')
    .option('-a, --address <address>', '')
    .action(getUnconfirmedTransactions);

  program
    .command('gettransactions')
    .description('get transactions')
    .option('-b, --blockId <id>', '')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-t, --type <n>', 'transaction type')
    .option('-s, --sort <field:mode>', '')
    .option('-a, --amount <n>', '')
    .option('-f, --fee <n>', '')
    .option('-m, --message <message>', '')
    .option('--senderPublicKey <key>', '')
    .option('--senderId <id>', '')
    .option('--recipientId <id>', '')
    .action(getTransactions);

  program
    .command('gettransaction [id]')
    .description('get transactions')
    .action(getTransaction);

  program
    .command('sendmoney')
    .description('send money to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-a, --amount <n>', '')
    .option('-f, --fee <n>', '')
    .option('-t, --to <address>', '')
    .option('-m, --message <message>', '')
    .action(sendMoney);

  program
    .command('sendasset')
    .description('send asset to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-c, --currency <currency>', '')
    .option('-a, --amount <amount>', '')
    .option('-t, --to <address>', '')
    .option('-m, --message <message>', '')
    .action(sendAsset);

  program
    .command('registerdelegate')
    .description('register delegate')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-u, --username <username>', '')
    .action(registerDelegate);

  program
    .command('listdiffvotes')
    .description('list the votes each other')
    .option('-u, --username <username>', '', process.env.ASCH_USER)
    .action(listdiffvotes);

  program
    .command('upvote')
    .description('vote for delegates')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-p, --publicKeys <public key list>', '')
    .action(upvote);

  program
    .command('downvote')
    .description('cancel vote for delegates')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-p, --publicKeys <public key list>', '')
    .action(downvote);

  program
    .command('setsecondsecret')
    .description('set second secret')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .action(setSecondSecret);

  program
    .command('registerchain')
    .description('register a sidechain')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-f, --metafile <metafile>', 'dapp meta file')
    .action(registerChain);

  program
    .command('deposit')
    .description('deposit assets to an app')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-d, --dapp <dapp id>', 'dapp id that you want to deposit')
    .option('-c, --currency <currency>', 'deposit currency')
    .option('-a, --amount <amount>', 'deposit amount')
    .action(deposit);

  program
    .command('dapptransaction')
    .description('create a dapp transaction')
    .option('-e, --secret <secret>', '')
    .option('-d, --dapp <dapp id>', 'dapp id')
    .option('-t, --type <type>', 'transaction type')
    .option('-a, --args <args>', 'json array format')
    .option('-f, --fee <fee>', 'transaction fee')
    .action(dappTransaction);

  program
    .command('lock')
    .description('lock account transfer')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-h, --height <height>', 'lock height')
    .action(lock);

  program
    .command('getfullblockbyid [id]')
    .description('get full block by block id')
    .action(getFullBlockById);

  program
    .command('getfullblockbyheight [height]')
    .description('get full block by block height')
    .action(getFullBlockByHeight);

  program
    .command('gettransactionbytes')
    .description('get transaction bytes')
    .option('-f, --file <file>', 'transaction file')
    .action(getTransactionBytes);

  program
    .command('gettransactionid')
    .description('get transaction id')
    .option('-f, --file <file>', 'transaction file')
    .action(getTransactionId);

  program
    .command('getblockbytes')
    .description('get block bytes')
    .option('-f, --file <file>', 'block file')
    .action(getBlockBytes);

  program
    .command('getblockpayloadhash')
    .description('get block bytes')
    .option('-f, --file <file>', 'block file')
    .action(getBlockPayloadHash);

  program
    .command('getblockid')
    .description('get block id')
    .option('-f, --file <file>', 'block file')
    .action(getBlockId);

  program
    .command('verifybytes')
    .description('verify bytes/signature/publickey')
    .option('-b, --bytes <bytes>', 'transaction or block bytes')
    .option('-s, --signature <signature>', 'transaction or block signature')
    .option('-p, --publicKey <publicKey>', 'signer public key')
    .action(verifyBytes);

  program
    .command('transaction')
    .description('create a transaction in mainchain')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-t, --type <type>', 'transaction type')
    .option('-a, --args <args>', 'json array format')
    .option('-m, --message <message>', '')
    .option('-f, --fee <fee>', 'transaction fee')
    .action(transaction);
}
