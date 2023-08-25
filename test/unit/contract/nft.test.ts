import { jest } from '@jest/globals';

import nft from '@gny/main/nft';
import { IApp } from '@gny/main/globalInterfaces';
import { ILogger, IAccount, ITransaction, Context } from '@gny/interfaces';
import { IConfig } from '@gny/interfaces';

// mocking of ES modules currently not supported in jest
// https://github.com/facebook/jest/issues/9430
// therefore we need to manually mock every function

declare global {
  namespace NodeJS {
    interface Global {
      app: Partial<IApp>;
      Config: Partial<IConfig>;
    }
  }
}

describe('nft', () => {
  beforeEach(done => {
    const logger: ILogger = {
      log: x => x,
      trace: x => x,
      debug: x => x,
      info: x => x,
      warn: x => x,
      error: x => x,
      fatal: x => x,
    };

    global.app = {
      validate: jest.fn((type, value) => null),
    };
    global.Config = {
      netVersion: 'localnet',
    };
    done();
  });

  afterEach(done => {
    delete (nft as any).sender;
    delete (nft as any).block;
    delete (nft as any).trs;

    // new
    jest.clearAllMocks();
    delete (nft as any).sdb;

    done();
  });

  describe('registerNftMaker', () => {
    it('zero arguments - returns Invalid arguments length', async () => {
      // @ts-ignore
      const result = await nft.registerNftMaker();
      expect(result).toEqual('Invalid arguments length');
    });

    it('one argument - returns Invalid arguments length', async () => {
      const param1 = 'first';
      // @ts-ignore
      const result = await nft.registerNftMaker(param1);
      expect(result).toEqual('Invalid arguments length');
    });

    it('three argument - returns Invalid arguments length', async () => {
      const param1 = 'first';
      const param2 = 'second';
      const param3 = 'third';
      // @ts-ignore
      const result = await nft.registerNftMaker(param1, param2, param3);
      expect(result).toEqual('Invalid arguments length');
    });

    it('throws if invaild maker name', async () => {
      const param1 = 1;
      const param2 = 'description';
      // @ts-ignore
      const result = await nft.registerNftMaker(param1, param2);
      expect(result).toEqual('Invalid nft maker name');
    });

    it('throws if maker name too short (zero length)', async () => {
      const param1 = '';
      const param2 = 'description';
      // @ts-ignore
      const result = await nft.registerNftMaker(param1, param2);
      expect(result).toEqual('Invalid nft maker name');
    });

    it('throws if maker name too long (17 length)', async () => {
      const param1 = 'A'.repeat(17);
      const param2 = 'description';

      // @ts-ignore
      const result = await nft.registerNftMaker(param1, param2);
      expect(result).toEqual('Invalid nft maker name');
    });

    // it.skip('throws if maker description (zero length)', async () => {
    //   const param1 = 'A';
    //   const param2 = 1;

    //   const result = await nft.registerNftMaker(param1, param2);
    //   expect(result).toEqual('sdf');
    // });

    it.skip('lock() gets called', async () => {});
    it.skip('if name already exists it does not return null', async () => {});
    it.skip('create() gets called', async () => {});
  });

  describe('createNft', () => {});
});
