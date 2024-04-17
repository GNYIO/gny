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
        const param1 = '';
        const param2 = 'description';

        const context = {
          sender: {},
        } as Context;

        // @ts-ignore
        const result = await verify.verify.call(context, param1, param2);
        expect(result).toEqual('argument identifier not valid');
      });
    });

    describe('signature', () => {});
  });
});
