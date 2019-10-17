/**
 * @jest-environment jsdom
 */
import { Connection } from '../../connection';
import * as lib from './lib';
import * as gnyClient from '../../index';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('transport', () => {
  const connection = new Connection();
  const transportApi = connection.api.Transport;

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

  describe('/getTransactions', () => {
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
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
