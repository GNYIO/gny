import * as gnyJS from '../../packages/gny-js';
import * as crypto from 'crypto';
import * as bs58 from 'bs58';
import axios from 'axios';

import si = require('systeminformation');
import Benchmark = require('benchmark');

async function onStart() {
  console.log('Benchmark for batch transactions started...');
}

async function onComplete(event) {
  const sysData = await si.getStaticData();

  const cpu = sysData.cpu;
  console.log('CPU Information:');
  console.log('- manufucturer: ' + cpu.manufacturer);
  console.log('- brand: ' + cpu.brand);
  console.log('- speed: ' + cpu.speed);
  console.log('- cores: ' + cpu.cores);
  console.log('- physical cores: ' + cpu.physicalCores);
  console.log('...');

  const memory = sysData.memLayout;
  let size = 0;
  for (const item of memory) {
    size += item.size;
  }

  console.log('Memory Information:');
  console.log('- size: ' + size);
  console.log('- type: ' + memory[0].type);
  console.log('...');

  console.log('Benchmark ended...');
}

function onAbort() {
  console.log('aborted...');
}

function onError(error) {
  console.log(error);
}

function createRandomAccount() {
  const PREFIX = 'G';
  const random = crypto.randomBytes(10);
  const hash1 = crypto
    .createHash('sha256')
    .update(random)
    .digest();
  const hash2 = crypto
    .createHash('ripemd160')
    .update(hash1)
    .digest();
  return PREFIX + bs58.encode(hash2);
}

function createTransactions(count) {
  const genesisSecret =
    'grow pencil ten junk bomb right describe trade rich valid tuna service';
  const message = '';
  const amount = 5 * 1e8;

  const transactions = [];

  for (let i = 0; i < count; ++i) {
    const recipient = createRandomAccount();
    const trs = gnyJS.basic.transfer(recipient, amount, message, genesisSecret);
    transactions.push(trs);
  }
  return transactions;
}

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

async function batchTransaction() {
  const test = createTransactions(100);
  try {
    const data = {
      transactions: test,
    };

    const result = await axios.put(
      'http://localhost:4096/api/transactions/batch',
      data,
      config
    );
    // console.log(JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log(e);
    // console.log(JSON.stringify(e.response.data, null, 2));
  }
}

const suite = new Benchmark.Suite('BatchTransactions', {
  // called when the suite starts running
  onStart: onStart,

  // called between running benchmarks
  onCycle: function(event) {
    console.log(String(event.target));
  },

  // called when aborted
  onAbort: onAbort,

  // called when a test errors
  onError: onError,

  // called when the suite completes running
  onComplete: onComplete,
});
suite.add('BatchTransactions', batchTransaction);

suite.run({ async: true });
