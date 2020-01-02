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

    it(
      '/openAccount (should not be reachable)',
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

    it(
      '/generateAccount (should not be reachable)',
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
        'should open an account with the publicKey',
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
          console.log(JSON.stringify(data.account, null, 2));
          expect(data).toHaveProperty('account');
        },
        lib.oneMinute
      );
    });

    describe('/generateAccount', () => {
      it(
        'should get the address and keys of the secet',
        async () => {
          const { data } = await axios.post(
            'http://localhost:4096/api/exchange/generateAccount'
          );

          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('address');
          expect(data).toHaveProperty('publicKey');
          expect(data).toHaveProperty('privateKey');
          expect(data).toHaveProperty('address');
        },
        lib.oneMinute
      );
    });
  });
});
