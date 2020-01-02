import * as lib from '../lib';
import axios from 'axios';
import * as ed from '@gny/ed';
import * as crypto from 'crypto';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

function createKeypair(secret: string) {
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  return ed.generateKeyPair(hash);
}

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const DOCKER_COMPOSE_FILE = 'config/integration/docker-compose.exchangeApi.yml';

describe('exchangeApi', () => {
  describe('exchangeApi (EXCHANGE_API=false)', () => {
    beforeAll(async done => {
      await lib.deleteOldDockerImages();
      await lib.buildDockerImage();
      done();
    }, lib.tenMinutes);

    beforeEach(async done => {
      // EXCHANGE_API should be deactivated by default
      await lib.spawnContainer();
      done();
    }, lib.oneMinute);

    afterEach(async done => {
      await lib.stopAndKillContainer();
      done();
    }, lib.oneMinute);

    describe('/openAccount', () => {
      it(
        '/openAccount should not be reachable',
        async () => {
          const resultPromise = axios.post(
            'http://localhost:4096/api/exchange/openAccount'
          );

          return expect(resultPromise).rejects.toHaveProperty('response.data', {
            success: false,
            error: 'API endpoint not found',
          });
        },
        lib.oneMinute
      );
    });

    describe('/generateAccount', () => {
      it(
        '/generateAccount should not be reachable',
        async () => {
          const resultPromise = axios.post(
            'http://localhost:4096/api/exchange/generateAccount'
          );

          return expect(resultPromise).rejects.toHaveProperty('response.data', {
            success: false,
            error: 'API endpoint not found',
          });
        },
        lib.oneMinute
      );
    });

    describe('/generatePublicKey', () => {
      it(
        '/generatePublicKey should not be rechable',
        async () => {
          const query = {
            secret: genesisSecret,
          };
          const resultPromise = axios.post(
            'http://localhost:4096/api/exchange/generatePublicKey',
            query,
            config
          );

          return expect(resultPromise).rejects.toHaveProperty('response.data', {
            success: false,
            error: 'API endpoint not found',
          });
        },
        lib.oneMinute
      );
    });
  });

  describe('exchangeApi (EXCHANGE_API=true)', () => {
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

    describe('/openAccount', () => {
      it(
        '/openAccount should open an account with a secret',
        async () => {
          const publicKey = createKeypair(genesisSecret).publicKey.toString(
            'hex'
          );
          const request = {
            publicKey,
          };

          const { data } = await axios.post(
            'http://localhost:4096/api/accounts/openAccount',
            request,
            config
          );
          expect(data).toHaveProperty('account');
        },
        lib.oneMinute
      );
    });

    describe('/generateAccount', () => {
      it(
        '/generateAccount should return a complete new account',
        async () => {
          const { data } = await axios.post(
            'http://localhost:4096/api/exchange/generateAccount'
          );

          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('address', expect.any(String));
          expect(data).toHaveProperty('publicKey', expect.any(String));
          expect(data).toHaveProperty('privateKey', expect.any(String));
        },
        lib.oneMinute
      );
    });

    describe('/generatePublicKey', () => {
      it(
        '/generatePublicKey should generate a public key from a secret',
        async () => {
          const query = {
            secret: genesisSecret,
          };
          const { data } = await axios.post(
            'http://localhost:4096/api/exchange/generatePublicKey',
            query,
            config
          );
          expect(data).toHaveProperty('publicKey');
        },
        lib.oneMinute
      );
    });
  });
});
