/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';
import { generateAddress } from '@gny/utils';
import { randomBytes } from 'crypto';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

function randomAddress() {
  return generateAddress(randomBytes(32).toString('hex'));
}

async function beforeUiaTransfer(uiaApi: any) {
  // prepare registerIssuer
  const name = 'ABC';
  const desc = 'some desc';
  const secret = genesisSecret;

  await uiaApi.registerIssuer(name, desc, secret);
  await lib.onNewBlock();

  // prepare registerAsset
  await uiaApi.registerAsset(
    'BBB',
    'some desc',
    String(10 * 1e8),
    8,
    genesisSecret
  );
  await lib.onNewBlock();

  // prepare issue
  const issue = gnyClient.uia.issue('ABC.BBB', String(10 * 1e8), genesisSecret);
  const issueTransData = {
    transaction: issue,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    issueTransData,
    config
  );
  await lib.onNewBlock();
}

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
        expect(response.status).toEqual(200);
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
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
