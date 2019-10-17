import * as bs58 from 'bs58';
import * as crypto from 'crypto';
import axios from 'axios';
import * as gnyClient from '..';

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
    const trs = gnyClient.basic.transfer(
      recipient,
      String(amount),
      message,
      genesisSecret
    );
    transactions.push(trs);
  }
  return transactions;
}

const test = createTransactions(2000);

const data = {
  transactions: test,
};

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

(async () => {
  try {
    const result = await axios.put(
      'http://localhost:4096/api/transactions/batch',
      data,
      config
    );

    console.log(JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log(JSON.stringify(e.response.data, null, 2));
  }
})();
