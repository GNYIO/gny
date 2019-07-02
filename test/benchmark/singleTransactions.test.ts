import * as gnyJS from '../../packages/gny-js';
import * as crypto from 'crypto';
import * as bs58 from 'bs58';
import axios from 'axios';

import si = require('systeminformation');
import Benchmark = require('benchmark');

async function onStart() {
  console.log('Benchmark for single transaction started...');
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

async function singleTransactions() {
  const test = createTransactions(10);
  try {
    for (const trs of test) {
      const data = {
        transaction: trs,
      };

      await axios.post('http://localhost:4096/peer/transactions', data, config);
    }
  } catch (e) {
    console.log(e);
    // console.log(JSON.stringify(e.response.data, null, 2));
  }
}

const suite = new Benchmark.Suite('SingleTransaction', {
  onStart: onStart,
  onCycle: function(event) {
    console.log(String(event.target));
  },
  onAbort: onAbort,
  onError: onError,
  onComplete: onComplete,
});
suite.add('SingleTransaction', singleTransactions);

suite.run({ async: true });
