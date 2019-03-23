import * as dockerCompose from 'docker-compose';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import { ILogger, IGenesisBlock } from '../../../src/interfaces';
import * as path from 'path';
import * as fs from 'fs';
import { cloneDeep } from 'lodash';


const ROOT_DIR = process.cwd();
const ORM_INTEGRATION_TESTS_DIR = path.join(ROOT_DIR, 'test/integration/orm');

const pathToGenesisBlock = path.join(ROOT_DIR, 'genesisBlock.json');
const GENESIS_BLOCK: IGenesisBlock = JSON.parse(fs.readFileSync(pathToGenesisBlock, { encoding: 'utf8' }));

const timeout = ms => new Promise(res => setTimeout(res, ms));

const logger: ILogger = {
  log: (x) => x,
  trace: (x) => x,
  debug: (x) => x,
  info: (x) => x,
  warn: (x) => x,
  error: (x) => x,
  fatal: (x) => x,
};

async function saveGenesisBlock(smartDB: SmartDB) {
  const block = Object.assign(cloneDeep(GENESIS_BLOCK), {
    _version_: 0,
  });

  const transactions = block.transactions;
  delete block.transactions;

  await smartDB.beginBlock(block);

  for (const trs of transactions) {
    trs.height = block.height;
    // trs.block = block;
    trs.signatures = JSON.stringify(trs.signatures);
    trs.args = JSON.stringify(trs.args);
    await smartDB.create('Transaction', trs);
  }

  await smartDB.commitBlock(block.height);
}



describe('integration - SmartDB', () => {
  let sut: SmartDB;
  beforeAll(async (done) => {
    await dockerCompose.upAll({
      cwd: ORM_INTEGRATION_TESTS_DIR,
      log: false,
    });
    await timeout(10000);

    done();
  }, 60 * 1000);
  afterAll(async (done) => {
    await dockerCompose.down({
      cwd: ORM_INTEGRATION_TESTS_DIR,
      log: false,
    });
    await dockerCompose.rm({
      cwd: ORM_INTEGRATION_TESTS_DIR,
      log: false,
    });
    done();
  }, 60 * 1000);

  beforeEach(async (done) => {
    sut = new SmartDB(logger);
    await sut.init();
    done();
  }, 20000);
  afterEach(async (done) => {
    await sut.close();
    sut = undefined;
    done();
  }, 20000);

  it('init works', async (done) => {
    await saveGenesisBlock(sut);

    const genesisAccount = { address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t' };
    const result = await sut.load('Account', genesisAccount);
    expect(result).toBeUndefined();
    done();
  }, 120 * 1000);

  it('getBlockByHeight', async (done) => {
    await saveGenesisBlock(sut);

    const loaded = await sut.getBlockByHeight(0);

    const expected = {
      _version_: 0,
      count: 203,
      delegate: 'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
      fees: 0,
      height: 0,
      id: '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
      payloadHash: '4b1598f8e52794520ea65837b44f58b39517cda40548ef6094e5b24c11af3493',
      previousBlock: null,
      reward: 0,
      signature: 'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c',
      timestamp: 0,
      version: 0,
    };
    expect(loaded).toEqual(expected);
    done();
  });

  it.skip('getBlockByHeight with transactions', async (done) => {
    await saveGenesisBlock(sut);

    const loaded = await sut.getBlockByHeight(0, true);
    expect(loaded).toBeTruthy();
    expect(loaded.transactions.length).toEqual(203);
    done();
  });

  it('getBlocksByHeightRange', async (done) => {
    await saveGenesisBlock(sut);

    const blocks = await sut.getBlocksByHeightRange(0, 1, false);
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(1);
    done();
  });

  it('getBlocksByHeightRange with transactions', async (done) => {
    done();
  });

  it.skip('rollback block', async (done) => {
    done();
  });
});