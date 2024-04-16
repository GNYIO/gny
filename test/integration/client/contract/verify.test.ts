/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gnyio/client';
import axios from 'axios';

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';
const publicKey = gnyClient.crypto.getKeys(genesisSecret).publicKey;
const address = gnyClient.crypto.getAddress(publicKey);

const GNY_PORT = 20096;
const GNY_APP_NAME = 'app20';
const NETWORK_PREFIX = '172.56';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('verify', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );

  beforeAll(async () => {
    await lib.stopOldInstances(DOCKER_COMPOSE_FILE, env);
    // do not build (this can run parallel)
    // await lib.buildDockerImage();
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnContainer(DOCKER_COMPOSE_FILE, env, GNY_PORT);
  }, lib.oneMinute);

  afterEach(async () => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
  }, lib.oneMinute);

  describe('Create verification', () => {
    it(
      'query single verification after creation of a verification (/api/verification/get)',
      async () => {
        expect.assertions(2);

        const trs = await connection.contract.Verification.createVerification(
          'MY_IDENTIFIER',
          'b01b781b89b7f6b7de1fba0cc992bf528f8422e3960e087f396cc83014028ad891bd848c2405b47419fdba643ce2206e1bad18a540b1a64e84d04c0c6aa1a40f',
          genesisSecret
        );
        expect(trs).toHaveProperty('transactionId');

        await lib.onNewBlock(GNY_PORT);

        const oneVerification = await connection.api.Verification.get(
          'MY_IDENTIFIER'
        );
        expect(oneVerification).toMatchObject({
          success: true,
          verification: {
            identifier: 'MY_IDENTIFIER',
            tid: expect.any(String),
            senderId: address,
            signature:
              'b01b781b89b7f6b7de1fba0cc992bf528f8422e3960e087f396cc83014028ad891bd848c2405b47419fdba643ce2206e1bad18a540b1a64e84d04c0c6aa1a40f',
            timestamp: expect.any(Number),
            _version_: expect.any(Number),
          },
        });
        console.log(oneVerification);
      },
      lib.oneMinute
    );

    it(
      'sets public key if not set',
      async () => {
        expect.assertions(2);

        // query account before hand, no public key
        const accountBefore = await connection.api.Account.getAccountByAddress(
          address
        );
        // @ts-ignore
        expect(accountBefore.publicKey).toBeNull();

        // create verification
        await connection.contract.Verification.createVerification(
          'MY_VERIFICATION',
          'hashhashhash',
          genesisSecret
        );

        await lib.onNewBlock(GNY_PORT);

        // query account after
        const accountAfter = await connection.api.Account.getAccountByAddress(
          address
        );
        // @ts-ignore
        expect(accountAfter.publicKey).toEqual(publicKey);
      },
      lib.oneMinute
    );

    it(
      'throws if identifier already used prior',
      async () => {
        expect.assertions(1);

        // create verification
        await connection.contract.Verification.createVerification(
          'MY_VERIFICATION',
          'hashhashhash',
          genesisSecret
        );

        await lib.onNewBlock(GNY_PORT);

        // calling second time should return an error
        const promise = connection.contract.Verification.createVerification(
          'MY_VERIFICATION',
          'hashhashhash',
          genesisSecret
        );
        return expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Verification already exists',
        });
      },
      lib.oneMinute
    );

    it.skip(
      'query /api/verification/ filter by senderId',
      async () => {},
      lib.oneMinute
    );

    it.skip(
      'query /api/verification/get by identifier',
      async () => {},
      lib.oneMinute
    );

    it.skip(
      'test /api/verification/ pagination',
      async () => {},
      lib.oneMinute
    );
  });
});
