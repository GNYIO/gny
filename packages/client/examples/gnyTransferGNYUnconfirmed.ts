import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';
const amount = 5 * 1e8;
const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
const message = '';

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

(async () => {
  try {
    const result = await axios.put(UNSIGNED_URL, trs, config);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log(JSON.stringify(e.response.data, null, 2));
  }
})();
