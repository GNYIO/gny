import { jest } from '@jest/globals';

import verify from '@gnyio/main/verify';
import { IApp } from '@gnyio/main/globalInterfaces';
import { IAccount, ITransaction, Context, IBlock } from '@gnyio/interfaces';
import { IConfig } from '@gnyio/interfaces';

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

describe('verify contract', () => {
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
    delete (verify as any).sender;
    delete (verify as any).block;
    delete (verify as any).trs;

    // new
    jest.clearAllMocks();
    delete (verify as any).sdb;

    done();
  });

  describe('verify', () => {
    describe('generic', () => {
      it('verify() - throws if wrong publicKey is set (collision attack attempt)', async () => {
        const param1 = 1;
        const param2 = 'description';

        const context = {
          sender: {
            publicKey: 'one',
          },
          trs: {
            senderPublicKey: 'two',
          },
        };

        const result = await verify.verify.call(context, param1, param2);
        expect(result).toEqual('collission attack attempt');
      });

      it('verify() - zero arguments - returns Invalid arguments length', async () => {
        // @ts-ignore
        const result = await verify.verify();
        expect(result).toEqual('Invalid arguments length');
      });

      it('verify() - one argument - returns Invalid arguments length', async () => {
        const param1 = 'first';
        // @ts-ignore
        const result = await verify.verify(param1);
        expect(result).toEqual('Invalid arguments length');
      });

      it('verify() - three argument - returns Invalid arguments length', async () => {
        const param1 = 'first';
        const param2 = 'second';
        const param3 = 'third';
        // @ts-ignore
        const result = await verify.verify(param1, param2, param3);
        expect(result).toEqual('Invalid arguments length');
      });
    });

    describe('identifier', () => {
      it('verify() - throws if identifier is too short (zero length)', async () => {
        const identifier = '';
        const signature = 'superlongsignature';

        const context = {
          sender: {},
        } as Context;

        // @ts-ignore
        const result = await verify.verify.call(context, identifier, signature);
        expect(result).toEqual('argument identifier not valid');
      });

      it('verify() - throws if identifier length is less than 5', async () => {
        const identifier = 'A'.repeat(4);
        const signature = '';

        const context = {
          sender: {},
        } as Context;

        // @ts-ignore
        const result = await verify.verify.call(context, identifier, signature);
        expect(result).toEqual('argument identifier not valid');
      });

      it('verify() - throws if length is greater than 64', async () => {
        const identifier = 'A'.repeat(65);
        const signature = '';

        const context = {
          sender: {},
        } as Context;

        // @ts-ignore
        const result = await verify.verify.call(context, identifier, signature);
        expect(result).toEqual('argument identifier not valid');
      });
    });

    describe('signature', () => {
      it('verify() - throws if signature is too short (zero length)', async () => {
        const identifier = 'A'.repeat(10);
        const signature = '';

        const context = {
          sender: {},
        } as Context;

        // @ts-ignore
        const result = await verify.verify.call(context, identifier, signature);
        expect(result).toEqual('argument signature not valid');
      });

      it('verify() - throws if signature length is less than 10', async () => {
        const identifier = 'A'.repeat(15);
        const signature = 'a'.repeat(9);

        const context = {
          sender: {},
        } as Context;

        // @ts-ignore
        const result = await verify.verify.call(context, identifier, signature);
        expect(result).toEqual('argument signature not valid');
      });

      it('verify() - throws if length is greater than 128', async () => {
        const identifier = 'A'.repeat(15);
        const signature = 'a'.repeat(129);

        const context = {
          sender: {},
        } as Context;

        // @ts-ignore
        const result = await verify.verify.call(context, identifier, signature);
        expect(result).toEqual('argument signature not valid');
      });
    });

    describe('execution', () => {
      it('verify() - throws if verification with same identifier already exists', async () => {
        expect.assertions(2);

        const identifier = 'SOME_IDENTIFIER';
        const signature = 'superlongsignature';

        const context = {
          sender: {
            address: 'GeBP6HdA2qp6KE2W9SFs9YvSc9od',
          } as IAccount,
          trs: {
            id: 'sometransactionid',
          },
        } as Context;

        const existsMock = jest.fn().mockReturnValueOnce(true);

        global.app.sdb = {
          lock: jest.fn(),
          exists: existsMock,
        } as any;

        // @ts-ignore
        const result = await verify.verify.call(context, identifier, signature);
        expect(result).toEqual('Verification already exists');
        expect(existsMock).toBeCalledTimes(1);
      });

      it('verify() - creates verification in db', async () => {
        expect.assertions(2);

        const identifier = 'SOME_IDENTIFIER';
        const signature = 'superlongsignature';

        const context = {
          sender: {
            address: 'GeBP6HdA2qp6KE2W9SFs9YvSc9od',
            publicKey: 'somepublickey',
          } as IAccount,
          trs: {
            id: 'somerandomid',
            senderPublicKey: 'somepublickey',
          },
          block: {
            height: String(25),
          },
        } as Context;

        const createMock = jest.fn().mockReturnValueOnce({});

        global.app.sdb = {
          lock: jest.fn(),
          exists: jest.fn().mockReturnValueOnce(Promise.resolve(false)),
          create: createMock,
        } as any;

        // @ts-ignore
        const result = await verify.verify.call(context, identifier, signature);
        expect(result).toBeNull();

        expect(createMock).toHaveBeenCalledTimes(1);
      });

      it.skip('verify() - sets publicKey for account when not set', async () => {});

      it.skip('verify() - sets publicKey for account when not set', async () => {});
    });
  });
});
