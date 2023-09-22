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

  describe('createNft', () => {
    describe('generic', () => {
      it('zero arguments - returns Invalid arguments length', async () => {
        // @ts-ignore
        const result = await nft.createNft();
        expect(result).toEqual('Invalid arguments length');
      });

      it('one argument - returns Invalid arguments length', async () => {
        const param1 = 'firstNft';
        // @ts-ignore
        const result = await nft.createNft(param1);
        expect(result).toEqual('Invalid arguments length');
      });

      it('two arguments - returns Invalid arguments length', async () => {
        const param1 = 'firstNft';
        const param2 = 'secondNft';
        // @ts-ignore
        const result = await nft.createNft(param1, param2);
        expect(result).toEqual('Invalid arguments length');
      });

      it('three arguments - returns Invalid arguments length', async () => {
        const param1 = 'firstNft';
        const param2 = 'secondNft';
        const param3 = 'thirdNft';
        // @ts-ignore
        const result = await nft.createNft(param1, param2, param3);
        expect(result).toEqual('Invalid arguments length');
      });

      it('five arguments - returns Invalid arguments length', async () => {
        const param1 = 'firstNft';
        const param2 = 'secondNft';
        const param3 = 'thirdNft';
        const param4 = 'fourthNft';
        const param5 = 'fivthNft';

        // @ts-ignore
        const result = await nft.createNft(
          param1,
          param2,
          param3,
          param4,
          param5
        );
        expect(result).toEqual('Invalid arguments length');
      });
    });

    describe('name', () => {
      it('4 character nft name (too short) - returns Invalid nft name', async () => {
        const name = 'abcd';
        const param2 = '';
        const param3 = '';
        const param4 = '';

        // @ts-ignore
        const result = await nft.createNft(name, param2, param3, param4);
        expect(result).toEqual('Invalid nft name');
      });

      it('21 character nft name (too long) - returns Invalid nft name', async () => {
        const name = 'a'.repeat(21);
        const param2 = '';
        const param3 = '';
        const param4 = '';

        // @ts-ignore
        const result = await nft.createNft(name, param2, param3, param4);
        expect(result).toEqual('Invalid nft name');
      });

      it('numbers within nft name - returns Invalid nft name', async () => {
        const name = 'ABCDE012345';
        const param2 = '';
        const param3 = '';
        const param4 = '';

        // @ts-ignore
        const result = await nft.createNft(name, param2, param3, param4);
        expect(result).toEqual('Invalid nft name');
      });
    });

    describe('hash', () => {
      it.skip('throws if hash is shorter than 30 characters', async () => {});
      it.skip('throws if hash is longer than 60 characters', async () => {});
      it.skip('throws if hash has special symbols in it', async () => {});
    });

    describe('makerId', () => {
      it('numbers within nft makerId - returns Invalid nft maker id', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'ABC123';
        const param4 = '';

        // @ts-ignore
        const result = await nft.createNft(name, hash, makerId, param4);
        expect(result).toEqual('Invalid nft maker name');
      });

      it('object as nft makerId - returns Invalid nft maker id', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = {};
        const param4 = '';

        // @ts-ignore
        const result = await nft.createNft(name, hash, makerId, param4);
        expect(result).toEqual('Invalid nft maker name');
      });

      it('array is nft makerId - returns Invalid nft maker id', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = [];
        const param4 = '';

        // @ts-ignore
        const result = await nft.createNft(name, hash, makerId, param4);
        expect(result).toEqual('Invalid nft maker name');
      });
    });

    describe('url', () => {
      it('object as nft url - returns Invalid nft url type', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = {};

        // @ts-ignore
        const result = await nft.createNft(name, hash, makerId, url);
        expect(result).toEqual('Invalid nft url type');
      });

      it('array as nft url - returns Invalid nft url', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = [];

        // @ts-ignore
        const result = await nft.createNft(name, hash, makerId, url);
        expect(result).toEqual('Invalid nft url type');
      });

      it('url longer than 255 - returns Invalid nft url', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = 'http://test.com/' + 'a'.repeat(255);

        // @ts-ignore
        const result = await nft.createNft(name, hash, makerId, url);
        expect(result).toEqual('Nft url too long');
      });
    });

    describe('execution', () => {
      it('if hash already exists - returns Nft with cid already exists', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = 'https://test.com';

        const context = {} as Context;

        global.app.sdb = {
          exists: jest.fn().mockReturnValue(true),
        } as any;

        // @ts-ignore
        const result = await nft.createNft.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual('Nft with hash already exists');
      });

      it('if name already exists - returns Nft with name already exists', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = 'https://test.com';

        const context = {} as Context;

        const existsMock = jest
          .fn()
          .mockReturnValueOnce(false) // first call (checks if hash exists)
          .mockReturnValueOnce(true); // second call (checks if name exists)

        global.app.sdb = {
          exists: existsMock,
        } as any;

        // @ts-ignore
        const result = await nft.createNft.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual('Nft with name already exists');

        // make sure the mocks have been called correctly
        expect(existsMock).toHaveBeenCalledTimes(2);
        expect(existsMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        });
        expect(existsMock).toHaveBeenNthCalledWith(2, expect.any(Function), {
          name: 'NFTnft',
        });
      });
    });
  });
});
