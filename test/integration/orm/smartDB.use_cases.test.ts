import { Variable } from '../../../packages/database-postgres/src/entity/Variable';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import * as lib from '../lib';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import { credentials as oldCredentials } from './databaseCredentials';
import { cloneDeep } from 'lodash';

describe('smartDB - use cases', () => {
  const dbName = 'usecasedb';
  let sut: SmartDB;
  const credentials = cloneDeep(oldCredentials);
  credentials.dbDatabase = dbName;

  beforeAll(done => {
    (async () => {
      await lib.dropDb(dbName);
      await lib.createDb(dbName);
      done();
    })();
  }, lib.tenSeconds);

  afterAll(done => {
    (async () => {
      await lib.dropDb(dbName);
      done();
    })();
  }, lib.tenSeconds);

  beforeEach(done => {
    (async () => {
      await lib.resetDb(dbName);

      sut = new SmartDB(logger, credentials);
      await sut.init();

      done();
    })();
  }, lib.tenSeconds);

  afterEach(done => {
    (async () => {
      await sut.close();

      done();
    })();
  }, lib.tenSeconds);

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
