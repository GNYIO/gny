import * as gnyJS from '@gny/gny-js';
import Api from '../lib/api';

let globalOptions;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
    mainnet: !!globalOptions.main,
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

export default function account(program) {
  globalOptions = program;

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
}
