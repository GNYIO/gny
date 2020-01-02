/**
 * @jest-environment jsdom
 */
import * as lib from '../../lib';
import * as gnyClient from '@gny/client';

describe('uia', () => {
  const connection = new gnyClient.Connection();
  const uiaApi = connection.contract.Uia;

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

  describe('/registerIssuer', () => {
    it(
      'should register issuer',
      async () => {
        const name = 'ABC';
        const desc = 'some desc';
        const secret =
          'grow pencil ten junk bomb right describe trade rich valid tuna service';

        const response = await uiaApi.registerIssuer(name, desc, secret);
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });

  describe('/registerAsset', () => {
    it(
      'should register asset',
      async () => {
        const name = 'BBB';
        const desc = 'some desc';
        const maximum = String(10 * 1e8);
        const precision = 8;
        const secret =
          'grow pencil ten junk bomb right describe trade rich valid tuna service';

        // register issuer
        await uiaApi.registerIssuer(name, desc, secret);
        await lib.onNewBlock();

        const response = await uiaApi.registerAsset(
          name,
          desc,
          maximum,
          precision,
          secret
        );
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });
});
