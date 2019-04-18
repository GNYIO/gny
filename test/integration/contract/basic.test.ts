import basic from '../../../src/contract/basic';
import BigNumber from 'bignumber.js';
import { ILogger } from '../../../src/interfaces';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';

jest.mock('../../../packages/database-postgres/src/smartDB');

describe('Consensus', () => {
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
      util: {
        address: {
          isAddress: jest.fn(addr => true),
          generateAddress: jest.fn(),
        },
        bignumber: BigNumber,
      },
      sdb: new SmartDB(logger),
    };
    done();
  });

  afterEach(done => {
    done();
  });

  describe('deleteCreatedVotes', () => {
    let amount;
    let recipient;
    beforeEach(done => {
      amount = 100000;
      recipient = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
      done();
    });

    it('should delete created votes', async done => {
      const recipientAccount = {
        address: recipient,
        gny: amount,
        username: null,
      };
      (basic as any).sender = {
        address: 'Gsdfsdffs',
        gny: 100000000,
      };
      (basic as any).block = {
        height: 1,
      };
      (basic as any).trs = {
        id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
        timestamp: 12165155,
      };
      global.app.sdb.increase.mockReturnValue(recipientAccount);
      global.app.sdb.load.mockReturnValue(recipientAccount);
      const validatedVotes = await basic.transfer(amount, recipient);
      expect(validatedVotes).toBeNull();
      done();
    });
  });
});
