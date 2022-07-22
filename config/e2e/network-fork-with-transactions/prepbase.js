const axios = require('axios');
const gnyClient = require('../../../packages/client/dist/');

const genesis = {
  secret:
    'summer produce nation depth home scheme trade pitch marble season crumble autumn',
  address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
};

const working = {
  secret:
    'eagle general degree fuel defy slim bunker oblige toward loan trial multiply',
  address: 'G3opyS22tR1NEnjfXPYM6fAhnmtpG',
};

const address1 = {
  secret:
    'oppose endless build wear clerk lava soldier fall valve plate arctic quarter',
  address: 'G3UJa3fboaUKYoVq8a5RAXT2VK6Md',
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    4096,
    'localnet',
    false
  );

  try {
    const trs = await connection.contract.Basic.send(
      working.address,
      String(1500 * 1e8),
      genesis.secret
    );
    console.log(
      `[prepbase] genesis -> working ${JSON.stringify(trs, null, 2)}`
    );
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
    console.log('[prepbase] exiting...');
    return;
  }

  await wait(10 * 1000);

  for (let i = 0; i < 5; ++i) {
    try {
      const trs = await connection.contract.Basic.send(
        address1.address,
        String(100 * 1e8),
        working.secret
      );
      console.log(
        `[prepbase] working -> account1: ${JSON.stringify(trs, null, 2)}`
      );
    } catch (err) {
      console.log(err.response ? err.response.data : err.message);
      keepGoing = false;
    }
    const seconds = 10 * 1000;
    console.log(`[prepbase] sleep ${seconds}ms`);
    await wait(seconds);
  }

  console.log('finished');
}

main();
