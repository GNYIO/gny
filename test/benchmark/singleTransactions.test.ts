/**
 * @jest-environment node
 */
import * as gnyJS from '../../packages/gny-js';
import * as crypto from 'crypto';
import axios from 'axios';
import * as lib from '../integration/lib';

import si = require('systeminformation');
import Benchmark = require('benchmark');
import { generateAddress } from '../../src/utils/address';

async function onStart() {
  console.log('Benchmark for single transaction started...');
}

function onAbort() {
  console.log('aborted...');
}

function onError(error) {
  console.log(error);
}

function createRandomAccount() {
  const random = crypto.randomBytes(10).toString('hex');
  return generateAddress(random);
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

  it(
    'test single',
    done => {
      async function onComplete(event) {
        console.log(
          'Benchmark for single transaction: ' + event.target.hz + ' ops/sec'
        );
        const sysData = await si.getStaticData();

        const cpu = sysData.cpu;
        console.log(`CPU Information:
        - manufucturer: ${cpu.manufacturer}
        - brand: ${cpu.brand}
        - speed: ${cpu.speed}
        - cores: ${cpu.cores}
        - cores: ${cpu.physicalCores}
        `);

        console.log('Benchmark ended...');
        done();
      }

      const suite = new Benchmark.Suite('SingleTransaction', {
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

      // add tests
      suite.add('SingleTransaction', {
        defer: true,
        fn: async function(deferred) {
          const trs = createTransactions(1);
          const data = {
            transaction: trs[0],
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            data,
            config
          );
          deferred.resolve();
        },
      });
      suite.run();
    },
    lib.tenMinutes
  );
});
