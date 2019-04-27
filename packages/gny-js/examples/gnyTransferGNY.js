const gnyJS = require('../');
const axios = require('axios');

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';
const amount = 5 * 1e8;
const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
const message = '';
const trs = gnyJS.basic.transfer(recipient, amount, message, genesisSecret);

console.log(JSON.stringify(trs, null, 2));

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
