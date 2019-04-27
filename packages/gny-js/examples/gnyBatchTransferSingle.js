const gnyJS = require('../');
const axios = require('axios');
const bs58 = require('bs58');
const crypto = require('crypto');

function createRandomAccount() {
  const PREFIX = 'G';
  const random = crypto.randomBytes(100);
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

function createTransactions(count) {
  const genesisSecret =
    'grow pencil ten junk bomb right describe trade rich valid tuna service';
  const message = '';
  const amount = 5 * 1e8;

  const transactions = [];

  for (let i = 0; i < count; ++i) {
    const recipient = createRandomAccount();
    const trs = gnyJS.basic.transfer(recipient, amount, message, genesisSecret);
    transactions.push(trs);
  }
  return transactions;
}

const test = createTransactions(10000);
// const doubleItems = new Set();
// test.forEach((item) => {
//   const howOft = test.map(x => x.id).filter(y => y === item.id).length
//   if (howOft > 1) {
//     doubleItems.add(item.id)
//   }
// })

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

(async () => {
  try {
    for (const trs of test) {
      const data = {
        transaction: trs,
      };

      const result = await axios.post(
        'http://localhost:4096/peer/transactions',
        data,
        config
      );
      console.log(JSON.stringify(result.data, null, 2));
    }
  } catch (e) {
    console.log(JSON.stringify(e.response.data, null, 2));
  }
})();
