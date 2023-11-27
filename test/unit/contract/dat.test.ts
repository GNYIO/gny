import { jest } from '@jest/globals';

import dat from '@gny/main/dat';
import { IApp } from '@gny/main/globalInterfaces';
import { IAccount, ITransaction, Context, IBlock } from '@gny/interfaces';
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

describe('dat contract', () => {
  beforeEach(done => {
    global.app = {
      validate: jest.fn((type, value) => null),
    };
    global.Config = {
      netVersion: 'localnet',
    };
    done();
  });

  afterEach(done => {
    delete (dat as any).sender;
    delete (dat as any).block;
    delete (dat as any).trs;

    // new
    jest.clearAllMocks();
    delete (dat as any).sdb;

    done();
  });

  describe('registerDatMaker', () => {
    describe('generic', () => {
      it('registerDatMaker() - zero arguments - returns Invalid arguments length', async () => {
        // @ts-ignore
        const result = await dat.registerDatMaker();
        expect(result).toEqual('Invalid arguments length');
      });

      it('registerDatMaker() - one argument - returns Invalid arguments length', async () => {
        const param1 = 'first';
        // @ts-ignore
        const result = await dat.registerDatMaker(param1);
        expect(result).toEqual('Invalid arguments length');
      });

      it('registerDatMaker() - three argument - returns Invalid arguments length', async () => {
        const param1 = 'first';
        const param2 = 'second';
        const param3 = 'third';
        // @ts-ignore
        const result = await dat.registerDatMaker(param1, param2, param3);
        expect(result).toEqual('Invalid arguments length');
      });
    });

    describe('name', () => {
      it('registerDatMaker() - throws if invaild maker name', async () => {
        const param1 = 1;
        const param2 = 'description';
        // @ts-ignore
        const result = await dat.registerDatMaker(param1, param2);
        expect(result).toEqual('Invalid dat maker name');
      });

      it('registerDatMaker() - throws if maker name too short (zero length)', async () => {
        const param1 = '';
        const param2 = 'description';
        // @ts-ignore
        const result = await dat.registerDatMaker(param1, param2);
        expect(result).toEqual('Invalid dat maker name');
      });

      it('registerDatMaker() - throws if maker name too long (31 length)', async () => {
        const param1 = 'A'.repeat(31);
        const param2 = 'description';

        // @ts-ignore
        const result = await dat.registerDatMaker(param1, param2);
        expect(result).toEqual('Invalid dat maker name');
      });
    });

    describe('description', () => {
      it('registerDatMaker() - throws if description is longer than 100 characters long', async () => {
        const name = 'ABC';
        const description = 'a'.repeat(101);

        // @ts-ignore
        const result = await dat.registerDatMaker(name, description);
        expect(result).toEqual('Invalid description');
      });
    });

    describe('execution', () => {
      it('registerDatMaker() - maker with same name exists - returns Dat maker name already exists', async () => {
        const name = 'MY_NFT_MAKER';
        const description = 'short description';

        const context = {
          sender: {
            address: 'GeBP6HdA2qp6KE2W9SFs9YvSc9od',
          } as IAccount,
        } as Context;

        const existsMock = jest.fn().mockReturnValueOnce(true);

        global.app.sdb = {
          lock: jest.fn(),
          exists: existsMock,
        } as any;

        // @ts-ignore
        const result = await dat.registerDatMaker.call(
          context,
          name,
          description
        );
        expect(result).toEqual('Dat maker name already exists');
      });

      it('registerDatMaker() - if a maker with same does not exist - create new maker', async () => {
        const name = 'MY_NFT_MAKER';
        const description = 'short description';

        const context = {
          sender: {
            address: 'GeBP6HdA2qp6KE2W9SFs9YvSc9od',
          } as IAccount,
          trs: {
            id: 'ididididididididididididididididididididid',
          } as ITransaction,
          block: {} as IBlock,
        } as Context;

        const existsMock = jest.fn().mockReturnValueOnce(false); // maker with same name does not exist
        const createMock = jest.fn().mockReturnValueOnce(null); // return null when creating the maker

        global.app.sdb = {
          lock: jest.fn(),
          exists: existsMock,
          create: createMock,
        } as any;

        // @ts-ignore
        const result = await dat.registerDatMaker.call(
          context,
          name,
          description
        );
        expect(result).toEqual(null); // success

        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          address: 'GeBP6HdA2qp6KE2W9SFs9YvSc9od',
          desc: 'short description',
          name: 'MY_NFT_MAKER',
          datCounter: String(0),
          tid: 'ididididididididididididididididididididid',
        });
      });
    });
  });

  describe('createDat', () => {
    describe('generic', () => {
      it('createDat() - zero arguments - returns Invalid arguments length', async () => {
        // @ts-ignore
        const result = await dat.createDat();
        expect(result).toEqual('Invalid arguments length');
      });

      it('createDat() - one argument - returns Invalid arguments length', async () => {
        const param1 = 'firstDat';
        // @ts-ignore
        const result = await dat.createDat(param1);
        expect(result).toEqual('Invalid arguments length');
      });

      it('createDat() - two arguments - returns Invalid arguments length', async () => {
        const param1 = 'firstDat';
        const param2 = 'secondDat';
        // @ts-ignore
        const result = await dat.createDat(param1, param2);
        expect(result).toEqual('Invalid arguments length');
      });

      it('createDat() - three arguments - returns Invalid arguments length', async () => {
        const param1 = 'firstDat';
        const param2 = 'secondDat';
        const param3 = 'thirdDat';
        // @ts-ignore
        const result = await dat.createDat(param1, param2, param3);
        expect(result).toEqual('Invalid arguments length');
      });

      it('createDat() - five arguments - returns Invalid arguments length', async () => {
        const par1 = 'firstDat';
        const par2 = 'secondDat';
        const par3 = 'thirdDat';
        const par4 = 'fourthDat';
        const par5 = 'fivthDat';

        // @ts-ignore
        const result = await dat.createDat(par1, par2, par3, par4, par5);
        expect(result).toEqual('Invalid arguments length');
      });
    });

    describe('name', () => {
      it('createDat() - 4 character dat name (too short) - returns Invalid dat name', async () => {
        const name = 'abcd';
        const param2 = '';
        const param3 = '';
        const param4 = '';

        // @ts-ignore
        const result = await dat.createDat(name, param2, param3, param4);
        expect(result).toEqual('Invalid dat name');
      });

      it('createDat() - 41 character dat name (too long) - returns Invalid dat name', async () => {
        const name = 'a'.repeat(41);
        const param2 = '';
        const param3 = '';
        const param4 = '';

        // @ts-ignore
        const result = await dat.createDat(name, param2, param3, param4);
        expect(result).toEqual('Invalid dat name');
      });
    });

    describe('hash', () => {
      it('createDat() - hash shorter than 30 characters - returns Invalid dat hash', async () => {
        const name = 'MY_NFT_NAME';
        const hash = 'a'.repeat(29);
        const makerId = '';
        const url = '';

        // @ts-ignore
        const result = await dat.createDat(name, hash, makerId, url);
        expect(result).toEqual('Invalid dat hash');
      });

      it('createDat() - hash longer than 64 characters - returns Invalid dat hash', async () => {
        const name = 'MY_NFT_NAME';
        const hash = 'a'.repeat(65);
        const makerId = '';
        const url = '';

        // @ts-ignore
        const result = await dat.createDat(name, hash, makerId, url);
        expect(result).toEqual('Invalid dat hash');
      });

      it('createDat() - hash has special symbols in it - returns Invalid dat hash', async () => {
        const name = 'MY_NFT_NAME';
        const hash = 'a'.repeat(30) + '!';
        const makerId = '';
        const url = '';

        // @ts-ignore
        const result = await dat.createDat(name, hash, makerId, url);
        expect(result).toEqual('Invalid dat hash');
      });
    });

    describe('makerId', () => {
      test.each([['A3'], ['A'], ['_1'], ['A1'.repeat(15)]])(
        'createDat() - numbers within dat makerId are valid - returns null (params: %p)',
        async (makerId: string) => {
          const context = {
            sender: {
              address: 'GeBP6HdA2qp6KE2W9SFs9YvSc9od',
            } as IAccount,
            trs: {
              id: 'idididididididididididididid',
            } as ITransaction,
            block: {} as IBlock,
          } as Context;

          const datName = 'NFTdat';
          const hash = 'a'.repeat(30);
          // const makerId = 'A3';
          const param4 = 'https://test.com/asdf.json';

          const existMock = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);

          const findOneMock = jest.fn().mockReturnValueOnce({
            address: 'GeBP6HdA2qp6KE2W9SFs9YvSc9od',
          });

          global.app.sdb = {
            lock: jest.fn().mockReturnValue(null),
            exists: existMock,
            findOne: findOneMock,
            create: jest.fn().mockReturnValue(undefined),
            update: jest.fn().mockReturnValueOnce(undefined),
          } as any;

          // @ts-ignore
          const result = await dat.createDat.call(
            context,
            datName,
            hash,
            makerId,
            param4
          );
          expect(result).toEqual(null);
        }
      );

      it('createDat() - object as dat makerId - returns Invalid dat maker id', async () => {
        const name = 'NFTdat';
        const hash = 'a'.repeat(30);
        const makerId = {};
        const param4 = '';

        // @ts-ignore
        const result = await dat.createDat(name, hash, makerId, param4);
        expect(result).toEqual('Invalid dat maker name');
      });

      it('createDat() - array is dat makerId - returns Invalid dat maker id', async () => {
        const name = 'NFTdat';
        const hash = 'a'.repeat(30);
        const makerId = [];
        const param4 = '';

        // @ts-ignore
        const result = await dat.createDat(name, hash, makerId, param4);
        expect(result).toEqual('Invalid dat maker name');
      });
    });

    describe('url', () => {
      it('createDat() - object as dat url - returns Invalid dat url type', async () => {
        const name = 'NFTdat';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = {};

        // @ts-ignore
        const result = await dat.createDat(name, hash, makerId, url);
        expect(result).toEqual('Invalid dat url type');
      });

      it('createDat() - array as dat url - returns Invalid dat url', async () => {
        const name = 'NFTdat';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = [];

        // @ts-ignore
        const result = await dat.createDat(name, hash, makerId, url);
        expect(result).toEqual('Invalid dat url type');
      });

      it('createDat() - url longer than 255 - returns Invalid dat url', async () => {
        const name = 'NFTdat';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = 'http://test.com/' + 'a'.repeat(255);

        // @ts-ignore
        const result = await dat.createDat(name, hash, makerId, url);
        expect(result).toEqual('Dat url too long');
      });
    });

    describe('execution', () => {
      it('createDat() - if hash already exists - returns Dat with cid already exists', async () => {
        const name = 'NFTdat';
        const hash = 'a'.repeat(30);
        const makerId = 'NFT_MAKER';
        const url = 'https://test.com';

        const context = {} as Context;

        const existMock = jest.fn().mockReturnValueOnce(true);

        global.app.sdb = {
          exists: existMock,
        } as any;

        // @ts-ignore
        const result = await dat.createDat.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual('Dat with hash already exists');

        expect(existMock).toHaveBeenCalledTimes(1);
        expect(existMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        });
      });

      it('createDat() - if name already exists - returns Dat with name already exists', async () => {
        const name = 'NFTdat';
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
        const result = await dat.createDat.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual('Dat with name already exists');

        // make sure the mocks have been called correctly
        expect(existsMock).toHaveBeenCalledTimes(2);
        expect(existsMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        });
        expect(existsMock).toHaveBeenNthCalledWith(2, expect.any(Function), {
          name: 'NFTdat',
        });
      });

      it('createDat() - if makerId does not exists - return Provided DatMaker does not exist', async () => {
        const name = 'NFTdat';
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
        const result = await dat.createDat.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual('Provided DatMaker does not exist');

        expect(existsMock).toHaveBeenCalledTimes(3);
        expect(existsMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        });
        expect(existsMock).toHaveBeenNthCalledWith(2, expect.any(Function), {
          name: 'NFTdat',
        });
        expect(existsMock).toHaveBeenNthCalledWith(3, expect.any(Function), {
          name: 'NFT_MAKER',
        });
      });

      it('createDat() - sender is not owner of maker - returns You do not own the makerId', async () => {
        const name = 'NFTdat';
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
        const result = await dat.createDat.call(
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

      it('createDat() - first dat for maker - does not set previousHash', async () => {
        const name = 'NFTdat';
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

        const findOneMock = jest.fn().mockReturnValueOnce({
          // return dat maker
          name: 'NFT_MAKER',
          desc: 'some desc',
          address: 'G3JrsGY4WGo7qfJJTeLLso4KE8J4T', // same address
          tid: 'beforebeforebeforebeforebeforebefore',
          datCounter: String(0),
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
        const result = await dat.createDat.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual(null); // no error

        // make sure findOne was called only once
        expect(findOneMock).toHaveBeenCalledTimes(1);
        expect(findOneMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          condition: {
            name: 'NFT_MAKER',
          },
        });

        // create dat was called 1 times
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          counter: '1',
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          name: 'NFTdat',
          datMakerId: 'NFT_MAKER',
          ownerAddress: 'G3JrsGY4WGo7qfJJTeLLso4KE8J4T',
          previousHash: null,
          tid: 'idididididididididididididid',
          timestamp: 1234000000,
          url: 'https://test.com',
        });

        // update datMaker was called 1 times
        expect(updateMock).toHaveBeenCalledTimes(1);
        expect(updateMock).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          {
            datCounter: String(1),
          },
          {
            name: 'NFT_MAKER',
          }
        );
      });

      it('createDat() - second dat for maker - sets previousHash', async () => {
        const name = 'NFTdatsecond';
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
            // return dat maker
            name: 'NFT_MAKER',
            desc: 'some desc',
            address: 'G3JrsGY4WGo7qfJJTeLLso4KE8J4T', // same address
            tid: 'beforebeforebeforebeforebeforebefore',
            datCounter: String(1), // this dat maker already created one dat
          })
          .mockReturnValueOnce({
            // return previous dat
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
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
        const result = await dat.createDat.call(
          context,
          name,
          hash,
          makerId,
          url
        );
        expect(result).toEqual(null); // no error

        // create dat was called 1 times
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenNthCalledWith(1, expect.any(Function), {
          counter: '2',
          hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          name: 'NFTdatsecond',
          datMakerId: 'NFT_MAKER',
          ownerAddress: 'G3JrsGY4WGo7qfJJTeLLso4KE8J4T',
          previousHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          tid: 'idididididididididididididid',
          timestamp: 1234000000,
          url: 'https://test.com',
        });

        // update datMaker was called 1 times
        expect(updateMock).toHaveBeenCalledTimes(1);
        expect(updateMock).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          {
            datCounter: String(2),
          },
          {
            name: 'NFT_MAKER',
          }
        );
      });
    });
  });
});
