import { jest } from '@jest/globals';

import nft from '@gny/main/nft';
import { IApp } from '@gny/main/globalInterfaces';
import {
  ILogger,
  IAccount,
  ITransaction,
  Context,
  IBlock,
} from '@gny/interfaces';
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
        const par1 = 'firstNft';
        const par2 = 'secondNft';
        const par3 = 'thirdNft';
        const par4 = 'fourthNft';
        const par5 = 'fivthNft';

        // @ts-ignore
        const result = await nft.createNft(par1, par2, par3, par4, par5);
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

        const existMock = jest.fn().mockReturnValueOnce(true);

        global.app.sdb = {
          exists: existMock,
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

        expect(existMock).toHaveBeenCalledTimes(1);
        expect(existMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        });
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

      it('if makerId does not exists - return Provided NftMaker does not exist', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = 'https://test.com';

        const context = {} as Context;

        const existsMock = jest
          .fn()
          .mockReturnValueOnce(false) // first call (checks if hash exists)
          .mockReturnValueOnce(false) // second call (checks if name exists)
          .mockReturnValueOnce(false); // third call (checks if maker exists)

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
        expect(result).toEqual('Provided NftMaker does not exist');

        expect(existsMock).toHaveBeenCalledTimes(3);
        expect(existsMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        });
        expect(existsMock).toHaveBeenNthCalledWith(2, expect.any(Function), {
          name: 'NFTnft',
        });
        expect(existsMock).toHaveBeenNthCalledWith(3, expect.any(Function), {
          name: 'NFT_MAKER',
        });
      });

      it('sender is not owner of maker - returns You do not own the makerId', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = 'https://test.com';

        // trs caller is not owner of maker
        const context = {
          sender: {
            address: 'G3JrsGY4WGo7qfJJTeLLso4KE8J4T',
          } as IAccount,
        } as Context;

        const existsMock = jest
          .fn()
          .mockReturnValueOnce(false) // first call (checks if hash exists)
          .mockReturnValueOnce(false) // second call (checks if name exists)
          .mockReturnValueOnce(true); // third call (checks if maker exists)

        const findOneMock = jest.fn().mockReturnValueOnce({
          address: 'G4YsQQjsc3xgFzVMiueUXyHzQnoW1', // different address
        });

        global.app.sdb = {
          exists: existsMock,
          findOne: findOneMock,
        } as any;

        // @ts-ignore
        const result = await nft.createNft.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual('You do not own the makerId');

        expect(findOneMock).toHaveBeenCalledTimes(1);
        expect(findOneMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          condition: {
            name: 'NFT_MAKER',
          },
        });
      });

      it('first nft for maker - does not set previousHash', async () => {
        const name = 'NFTnft';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = 'https://test.com';

        // trs caller is not owner of maker
        const context = {
          sender: {
            address: 'G3JrsGY4WGo7qfJJTeLLso4KE8J4T',
          } as IAccount,
          trs: {
            id: 'idididididididididididididid',
            timestamp: 1234000000,
          } as ITransaction,
          block: {} as IBlock,
        } as Context;

        const existsMock = jest
          .fn()
          .mockReturnValueOnce(false) // first call (checks if hash exists)
          .mockReturnValueOnce(false) // second call (checks if name exists)
          .mockReturnValueOnce(true); // third call (checks if maker exists)

        const findOneMock = jest
          .fn()
          .mockReturnValueOnce({
            // return nft maker
            name: 'NFT_MAKER',
            desc: 'some desc',
            address: 'G3JrsGY4WGo7qfJJTeLLso4KE8J4T', // same address
            tid: 'beforebeforebeforebeforebeforebefore',
            nftCounter: String(0),
          })
          .mockReturnValueOnce({
            // return nft
            hash: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
          });

        const createMock = jest.fn().mockReturnValueOnce(undefined);
        const updateMock = jest.fn().mockReturnValueOnce(undefined);

        global.app.sdb = {
          exists: existsMock,
          findOne: findOneMock,
          lock: jest.fn().mockReturnValue(null),
          create: createMock,
          update: updateMock,
        } as any;

        // @ts-ignore
        const result = await nft.createNft.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual(null); // no error

        // create nft was called 1 times
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          counter: '1',
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          name: 'NFTnft',
          nftMakerId: 'NFT_MAKER',
          ownerAddress: 'G3JrsGY4WGo7qfJJTeLLso4KE8J4T',
          previousHash: null,
          tid: 'idididididididididididididid',
          timestamp: 1234000000,
          url: 'https://test.com',
        });

        // update nftMaker was called 1 times
        expect(updateMock).toHaveBeenCalledTimes(1);
        expect(updateMock).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          {
            nftCounter: String(1),
          },
          {
            name: 'NFT_MAKER',
          }
        );
      });

      it.skip('second nft for maker - does set previousHash', async () => {});
    });
  });
});
