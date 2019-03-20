import { BasicEntityTracker, EntityChanges } from '../../../packages/database-postgres/src/basicEntityTracker';
import { LRUEntityCache } from '../../../packages/database-postgres/src/lruEntityCache';
import { ModelSchema } from '../../../packages/database-postgres/src/modelSchema';
import { LogManager } from '../../../packages/database-postgres/src/logger';
import { ILogger } from '../../../src/interfaces';

describe('orm - BasicEntityTracker', () => {
  let sut: BasicEntityTracker;
  beforeEach(() => {
    const globalLogger: ILogger = {
      log: (x) => x,
      trace: (x) => x,
      debug: (x) => x,
      info: (x) => x,
      warn: (x) => x,
      error: (x) => x,
      fatal: (x) => x,
    };
    LogManager.setLogger(globalLogger);

    const modelSchemas = new Map<string, ModelSchema>();

    const lruEntityCache = new LRUEntityCache(modelSchemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory = async (from: number, till: number) => {
      return Promise.resolve(new Map<number, EntityChanges[]>());
    };
    sut = new BasicEntityTracker(lruEntityCache, modelSchemas, MAXVERSIONHOLD, logger, onLoadHistory);
  });
  afterEach(() => {
    sut = undefined;
  });

  it.skip('creation', (done) => {
    done();
  });
  it.skip('prop confirming - after creation is confirming -> false', (done) => {
    done();
  });
  it.skip('prop confirming - after begin is confirming -> true', (done) => {
    done();
  });
  it.skip('getHistoryByVersion', (done) => {
    done();
  });
});
