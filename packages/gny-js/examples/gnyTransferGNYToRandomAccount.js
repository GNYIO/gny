const gnyJS = require('../');
const axios = require('axios');
const bs58 = require('bs58');
const crypto = require('crypto');

function createRandomAccount() {
  const PREFIX = 'G';
  const random = crypto.randomBytes(1);
  const hash1 = crypto
    .createHash('sha256')
    .update(random)
    .digest();
  const hash2 = crypto
    .createHash('ripemd160')
    .update(hash1)
    .digest();
  return PREFIX + bs58.encode(hash2);
}

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';
const amount = 5 * 1e8;

const recipient = createRandomAccount();
const message = '';

const trs = gnyJS.basic.transfer(recipient, amount, message, genesisSecret);

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
