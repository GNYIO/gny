/**
 * @jest-environment node
 */
import * as gnyJS from '../../packages/gny-js';
import * as crypto from 'crypto';
import * as bs58 from 'bs58';
import axios from 'axios';
import * as lib from './lib';

import Benchmark = require('benchmark');

async function onStart() {
  console.log('Benchmark for single transaction started...');
  // await lib.deleteOldDockerImages();
  // await lib.buildDockerImage();
  // await lib.spawnContainer();

  // await lib.sleep(lib.tenMinutes);
}

function onComplete(event) {
  console.log('Benchmark ended...');
  console.log('The number of iterations per second: ' + event.target.hz);
  console.log('Successful test: ' + this.filter('successful').map('name'));
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

describe('test single', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, lib.oneMinute);

  it('test single', async () => {
    async function batchTransaction() {
      const test = createTransactions(10);
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
    suite.add('BatchTransactions#test', batchTransaction);

    suite.run();
  });
});
