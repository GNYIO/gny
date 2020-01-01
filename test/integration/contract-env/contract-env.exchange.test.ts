import * as lib from '../lib';
import axios from 'axios';
import * as crypto from 'crypto';
import * as ed from '../../../packages/ed/src/index';
import { generateAddress } from '@gny/utils';

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

const UNSIGNED_URL = 'http://localhost:4096/api/exchange';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const DOCKER_COMPOSE_FILE = 'config/integration/docker-compose.exchangeApi.yml';

describe('contract (exchange) environment', () => {
  // EXCHANGE_api=false
  describe('EXCHANGE_API=false', () => {
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
      'sending UNSIGNED trs should not work',
      async () => {
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';

        const trs = {
          secret: genesisSecret,
          secondSecret: undefined,
          fee: String(0.1 * 1e8),
          type: 0,
          args: [amount, recipient],
        };

        const resultPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(resultPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'API endpoint not found',
        });
      },
      lib.oneMinute
    );
  });

  // EXCHANGE_api=true
  describe('EXCHANGE_API=true', () => {
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

    it(
      'send UNSIGNED transaction',
      async done => {
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';

        const trs = {
          secret: genesisSecret,
          secondSecret: undefined,
          fee: String(0.1 * 1e8),
          type: 0,
          args: [amount, recipient],
        };

        const result = await axios.put(UNSIGNED_URL, trs, config);

        expect(result.data).toHaveProperty('transactionId');
        done();
      },
      lib.oneMinute
    );

    it(
      'sending UNSIGNED transaction with NOT complient BIP39 secret returns error',
      async () => {
        const WRONG_SECRET = 'wrong password';
        const trs = {
          type: 0,
          secret: WRONG_SECRET,
          args: [lib.createRandomAddress(), 22 * 1e8],
          message: undefined,
        };
        const contractPromise = axios.put(UNSIGNED_URL, trs, config);
        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );

    it(
      'message field (UNSIGNED transaction) allows empty string',
      async done => {
        const recipient = lib.createRandomAddress();
        const EMPTY_STRING = '';
        const trs = {
          type: 0,
          fee: String(0.1 * 1e8),
          args: ['1', recipient],
          secret: genesisSecret,
          message: EMPTY_STRING,
        };

        const result = await axios.put(UNSIGNED_URL, trs, config);

        expect(result.data).toHaveProperty('transactionId');
        done();
      },
      lib.oneMinute
    );

    it(
      'message field (UNSIGNED transaction) rejects if it consists non-alphynumerical letter',
      async () => {
        const recipient = lib.createRandomAddress();
        const NON_ALPHYNUMERICAL_MESSAGE = 'drop table block;--';
        const trs = {
          type: 0,
          fee: String(0.1 * 1e8),
          args: ['1', recipient],
          secret: genesisSecret,
          message: NON_ALPHYNUMERICAL_MESSAGE,
        };

        const resultPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(resultPromise).rejects.toHaveProperty('response.data', {
          error: 'Invalid transaction body',
          success: false,
        });
      },
      lib.oneMinute
    );

    it(
      'message field (UNSIGNED transaction) longer then 256 returns error',
      async () => {
        const recipient = lib.createRandomAddress();
        const trs = {
          type: 0,
          fee: String(0.1 * 1e8),
          args: ['1', recipient],
          secret: genesisSecret,
          message: 'b'.repeat(257),
        };

        const contractPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );

    it(
      'timestamp is bigger (UNSIGNED transaction) then Number Number.MAX_SAFE_INTEGER +1',
      async () => {
        const TOO_BIG_timestamp = Number.MAX_SAFE_INTEGER + 100;
        const trs = {
          fee: 0.1 * 1e8,
          secret: genesisSecret,
          type: 0,
          timestamp: TOO_BIG_timestamp,
          args: [lib.createRandomAddress(), 22 * 1e8],
        };
        const contractPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );

    it(
      'negative timestamp (UNSIGNED transaction) returns error',
      async () => {
        const NEGATIVE_timestamp = -10;
        const trs = {
          fee: String(0.1 * 1e8),
          secret: genesisSecret,
          type: 0,
          timestamp: NEGATIVE_timestamp,
          args: [lib.createRandomAddress(), 22 * 1e8],
        };
        const contractPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );

    it(
      'zero timestamp (UNSIGNED transaction) returns error',
      async () => {
        const ZERO_timestamp = 0;
        const trs = {
          fee: String(0.1 * 1e8),
          secret: genesisSecret,
          type: 0,
          timestamp: ZERO_timestamp,
          args: [lib.createRandomAddress(), 22 * 1e8],
        };
        const contractPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );

    it(
      'negative fee with (UNSIGNED transaction) returns error',
      async () => {
        const NEGATIVE_FEE = String(-100);
        const trs = {
          fee: NEGATIVE_FEE,
          secret: genesisSecret,
          type: 0,
          args: [lib.createRandomAddress(), 22 * 1e8],
        };
        const contractPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );

    it(
      'sending trs with id (UNSIGNED transaction) returns error',
      async () => {
        const ID = crypto.randomBytes(32).toString('hex');
        console.log(ID);

        const trs = {
          id: ID,
          fee: String(0.1 * 1e8),
          secret: genesisSecret,
          type: 0,
          args: [lib.createRandomAddress(), 10 * 1e8],
        };
        const contractPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );

    it(
      'sending trs with senderId (UNSIGNED transaction) returns error',
      async () => {
        const keys = createKeypair(genesisSecret);
        const SENDER_ID = generateAddress(keys.publicKey);

        const trs = {
          senderId: SENDER_ID,
          fee: String(0.1 * 1e8),
          secret: genesisSecret,
          type: 0,
          args: [lib.createRandomAddress(), 10 * 1e8],
        };
        const contractPromise = axios.put(UNSIGNED_URL, trs, config);

        return expect(contractPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid transaction body',
        });
      },
      lib.oneMinute
    );
  });
});
