import { Variable } from '@gny/database-postgres';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import * as lib from '../lib';
import { SmartDB } from '@gny/database-postgres';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB - use cases', () => {
  const dbName = 'usecasedb';
  let sut: SmartDB;
  const credentials = copyObject(oldCredentials);
  credentials.dbDatabase = dbName;

  beforeAll(async () => {
    await lib.dropDb(dbName);
    await lib.createDb(dbName);
  }, lib.tenSeconds);

  afterAll(async () => {
    await lib.dropDb(dbName);
  }, lib.tenSeconds);

  beforeEach(async () => {
    await lib.resetDb(dbName);

    sut = new SmartDB(logger, credentials);
    await sut.init();
  }, lib.tenSeconds);

  afterEach(async () => {
    await sut.close();
  }, lib.tenSeconds);

  it('update of in-memory Model should be persisted after a commitBlock() call', async () => {
    expect.assertions(4);

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
  });

  it.skip('writing 5 blocks to disc, then stop the SmartDB, restart it and rollback to heigh 2', async () => {});
});
