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

const secondAccountSecret =
  'garbage device lazy spring train enter behave flip round struggle cash suffer';
const secondAccountPublicKey = gnyClient.crypto.getKeys(secondAccountSecret)
  .publicKey;
const secondAccountAddress = gnyClient.crypto.getAddress(
  secondAccountPublicKey
);

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
            height: expect.stringMatching(/^[0-9]+$/),
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

    it(
      'query /api/verification/ filter by senderId',
      async () => {
        expect.assertions(3);

        await connection.contract.Basic.send(
          secondAccountAddress,
          String(2000 * 1e8),
          genesisSecret
        );

        await connection.contract.Verification.createVerification(
          'GENESIS_VERIFICATION',
          'aaaaaaaaaaaaaaaaaaaa',
          genesisSecret
        );

        await lib.onNewBlock(GNY_PORT);

        await connection.contract.Verification.createVerification(
          'SECOND_VERIFICATION',
          'bbbbbbbbbbbbbbbbbbb',
          secondAccountSecret
        );

        await lib.onNewBlock(GNY_PORT);

        const all = await connection.api.Verification.getAll(100, 0);
        expect(all).toEqual({
          success: true,
          count: 2,
          verifications: [
            {
              identifier: 'GENESIS_VERIFICATION',
              tid: expect.any(String),
              senderId: address,
              signature: 'aaaaaaaaaaaaaaaaaaaa',
              timestamp: expect.any(Number),
              height: expect.stringMatching(/^[0-9]+$/),
              _version_: expect.any(Number),
            },
            {
              identifier: 'SECOND_VERIFICATION',
              tid: expect.any(String),
              senderId: secondAccountAddress,
              signature: 'bbbbbbbbbbbbbbbbbbb',
              timestamp: expect.any(Number),
              height: expect.stringMatching(/^[0-9]+$/),
              _version_: expect.any(Number),
            },
          ],
        });

        // should return only verifications created by genesis account
        const filterByGenesis = await connection.api.Verification.getAll(
          100,
          0,
          address
        );
        expect(filterByGenesis).toEqual({
          success: true,
          count: 1,
          verifications: [
            {
              identifier: 'GENESIS_VERIFICATION',
              tid: expect.any(String),
              senderId: address,
              signature: 'aaaaaaaaaaaaaaaaaaaa',
              timestamp: expect.any(Number),
              height: expect.stringMatching(/^[0-9]+$/),
              _version_: expect.any(Number),
            },
          ],
        });

        // should return only verifications created by second account
        const filterByAddress = await connection.api.Verification.getAll(
          100,
          0,
          secondAccountAddress
        );
        expect(filterByAddress).toEqual({
          success: true,
          count: 1,
          verifications: [
            {
              identifier: 'SECOND_VERIFICATION',
              tid: expect.any(String),
              senderId: secondAccountAddress,
              signature: 'bbbbbbbbbbbbbbbbbbb',
              timestamp: expect.any(Number),
              height: expect.stringMatching(/^[0-9]+$/),
              _version_: expect.any(Number),
            },
          ],
        });
      },
      lib.oneMinute
    );

    it(
      'test /api/verification/ pagination',
      async () => {
        // expect.assertions(3);

        await connection.contract.Verification.createVerification(
          'FIRST_VERIFICATION',
          'a'.repeat(10),
          genesisSecret
        );
        await connection.contract.Verification.createVerification(
          'SECOND_VERIFICATION',
          'b'.repeat(10),
          genesisSecret
        );
        await connection.contract.Verification.createVerification(
          'THIRD_VERIFICATION',
          'c'.repeat(10),
          genesisSecret
        );
        await connection.contract.Verification.createVerification(
          'FOURTH_VERIFICATION',
          'd'.repeat(10),
          genesisSecret
        );

        await lib.onNewBlock(GNY_PORT);

        const first = {
          identifier: 'FIRST_VERIFICATION',
          tid: expect.any(String),
          senderId: address,
          signature: 'a'.repeat(10),
          timestamp: expect.any(Number),
          height: expect.stringMatching(/^[0-9]+$/),
          _version_: expect.any(Number),
        };
        const second = {
          identifier: 'SECOND_VERIFICATION',
          tid: expect.any(String),
          senderId: address,
          signature: 'b'.repeat(10),
          timestamp: expect.any(Number),
          height: expect.stringMatching(/^[0-9]+$/),
          _version_: expect.any(Number),
        };
        const third = {
          identifier: 'THIRD_VERIFICATION',
          tid: expect.any(String),
          senderId: address,
          signature: 'c'.repeat(10),
          timestamp: expect.any(Number),
          height: expect.stringMatching(/^[0-9]+$/),
          _version_: expect.any(Number),
        };
        const fourth = {
          identifier: 'FOURTH_VERIFICATION',
          tid: expect.any(String),
          senderId: address,
          signature: 'd'.repeat(10),
          timestamp: expect.any(Number),
          height: expect.stringMatching(/^[0-9]+$/),
          _version_: expect.any(Number),
        };

        // query
        const result = await connection.api.Verification.getAll(100, 0);
        expect(result).toEqual({
          success: true,
          count: 4,
          verifications: [first, second, third, fourth],
        });

        const onlyFirst = await connection.api.Verification.getAll(1, 0);
        expect(onlyFirst).toEqual({
          success: true,
          count: 4,
          verifications: [first],
        });

        const onlySecond = await connection.api.Verification.getAll(1, 1);
        expect(onlySecond).toEqual({
          success: true,
          count: 4,
          verifications: [second],
        });

        const onlyThird = await connection.api.Verification.getAll(1, 2);
        expect(onlyThird).toEqual({
          success: true,
          count: 4,
          verifications: [third],
        });

        const onlyFourth = await connection.api.Verification.getAll(1, 3);
        expect(onlyFourth).toEqual({
          success: true,
          count: 4,
          verifications: [fourth],
        });
      },
      lib.oneMinute
    );

    it(
      'returns error if verification can not be found /api/verification/get',
      async () => {
        expect.assertions(1);

        const identifier = 'DOES_NOT_EXIST';

        const promise = connection.api.Verification.get(identifier);
        return expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'verification could not be found',
        });
      },
      lib.oneMinute
    );
  });
});
