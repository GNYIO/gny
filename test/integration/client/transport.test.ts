/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gny/client';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('transport', () => {
  const connection = new gnyClient.Connection();
  const transportApi = connection.api.Transport;
  const blockApi = connection.api.Block;

  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();

    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, lib.oneMinute);

  describe('/sendTransaction', () => {
    it(
      'should execute one transaction',
      async () => {
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';

        // Transaction
        const trs = gnyClient.basic.transfer(
          recipient,
          String(amount),
          message,
          genesisSecret
        );

        const response = await transportApi.sendTransaction(trs);
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });
});
