import { Variable } from '../../../packages/database-postgres/entity/Variable';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import * as fs from 'fs';
import * as lib from '../lib';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';

describe('smartDB - use cases', () => {
  let sut: SmartDB;
  let configRaw: string;

  beforeAll(done => {
    (async () => {
      await lib.stopAndKillPostgres();
      configRaw = fs.readFileSync('ormconfig.postgres.json', {
        encoding: 'utf8',
      });
      await lib.sleep(500);

      done();
    })();
  }, lib.oneMinute);

  beforeEach(done => {
    (async () => {
      // stopping is safety in case a test before fails
      await lib.stopAndKillPostgres();
      await lib.spawnPostgres();
      sut = new SmartDB(logger, {
        cachedBlockCount: 10,
        maxBlockHistoryHold: 10,
        configRaw: configRaw,
      });
      await sut.init();

      done();
    })();
  }, lib.oneMinute);

  afterEach(done => {
    (async () => {
      await sut.close();
      await lib.sleep(4 * 1000);
      await lib.stopAndKillPostgres();
      await lib.sleep(15 * 1000);

      done();
    })();
  }, lib.oneMinute);

  it('update of in-memory Model should be persisted after a commitBlock() call', async done => {
    await saveGenesisBlock(sut);

    await sut.createOrLoad<Variable>(Variable, {
      key: 'some',
      value: 'thing',
    });
    await sut.createOrLoad<Variable>(Variable, {
      key: 'key',
      value: 'value',
    });

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // pre check
    const preCheckResult = await sut.findAll<Variable>(Variable, {
      condition: {
        key: 'key',
      },
    });
    expect(preCheckResult).toHaveLength(1);
    expect(preCheckResult[0]).toEqual({
      key: 'key',
      value: 'value',
      _version_: 1,
    });

    // act
    await sut.update<Variable>(Variable, { value: 'newValue' }, { key: 'key' });

    // persist changes
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    // check
    const result = await sut.findAll<Variable>(Variable, {
      condition: {
        key: 'key',
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      key: 'key',
      value: 'newValue',
      _version_: 2,
    });

    done();
  });

  it.skip('writing 5 blocks to disc, then stop the SmartDB, restart it and rollback to heigh 2', async done => {
    done();
  });
});
