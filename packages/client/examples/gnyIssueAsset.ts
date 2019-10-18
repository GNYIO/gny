import axios from 'axios';
import * as gnyClient from '..';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';
const currency = 'AAA.BBB';
const amount = String(5 * 1e8);
const trs = gnyClient.uia.issue(currency, amount, genesisSecret);

const data = {
  transaction: trs,
};

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

(async () => {
  try {
    const result = await axios.post(
      'http://localhost:4096/peer/transactions',
      data,
      config
    );
    console.log(JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log(JSON.stringify(e.response.data, null, 2));
  }
})();
