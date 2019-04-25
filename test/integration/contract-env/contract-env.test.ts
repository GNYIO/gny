import * as lib from '../lib';
import axios from 'axios';

const oneMinute = 60 * 1000;
const tenMinutes = 10 * 60 * 1000;

describe('contract environment', () => {
  beforeAll(async done => {
    await lib.buildDockerImage();
    done();
  }, tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, oneMinute);

  it(
    'check blocks',
    async done => {
      const height = await lib.getHeight();
      expect(typeof height).toEqual('number');

      done();
    },
    oneMinute
  );

  it('send transaction', async done => {
    const genesisSecret =
      'grow pencil ten junk bomb right describe trade rich valid tuna service';
    const amount = 5 * 1e8;
    const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';

    const trs = {
      secret: genesisSecret,
      secondSecret: undefined,
      fee: 0.1 * 1e8,
      type: 0,
      args: [amount, recipient],
    };

    const config = {
      headers: {
        magic: '594fe0f3',
      },
    };

    const UNSIGNED_URL = 'http://localhost:4096/api/transactions';

    const result = await axios.put(UNSIGNED_URL, trs, config);
    // console.log(JSON.stringify(result.data, null, 2));

    expect(result.data).toHaveProperty('transactionId');
    done();
  });
});
