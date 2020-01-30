/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const DOCKER_COMPOSE_FILE = 'config/integration/docker-compose.exchangeApi.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('exchange', () => {
  const connection = new gnyClient.Connection();
  const exchangeApi = connection.api.Exchange;

  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    // use specific docker-compose file where the EXCHANGE_API is active
    await lib.spawnContainer(DOCKER_COMPOSE_FILE);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, lib.oneMinute);

  describe('Get account information', () => {
    describe('/openAccount', () => {
      it(
        'should open an account with a secret',
        async done => {
          const secret = genesisSecret;
          const response = await exchangeApi.openAccount(secret);
          expect(response.success).toBeTruthy();
          done();
        },
        lib.oneMinute
      );
    });

    describe('/generateAccount', () => {
      it(
        'should return a complete new account',
        async done => {
          const response = await exchangeApi.generateAccount();
          expect(response.success).toBeTruthy();
          done();
        },
        lib.oneMinute
      );
    });

    describe('/generatePublicKey', () => {
      it(
        'should generate a public key from a secret',
        async done => {
          const secret = genesisSecret;
          const response = await exchangeApi.generatePublicKey(secret);
          expect(response.success).toBeTruthy();
          done();
        },
        lib.oneMinute
      );
    });
  });
});
