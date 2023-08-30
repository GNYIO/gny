/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';

const GNY_PORT = 15096;
const GNY_APP_NAME = 'app12';
const NETWORK_PREFIX = '172.31';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);

const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const connection = new gnyClient.Connection('127.0.0.1', GNY_PORT, 'localnet');

async function registerNftMaker(
  name: string,
  description: string,
  secret: string
) {
  const makerResponse = await connection.contract.Nft.registerNftMaker(
    name,
    description,
    secret
  );
  expect(makerResponse).toHaveProperty('transactionId');

  await lib.onNewBlock(GNY_PORT);

  return makerResponse;
}

async function registerNft(
  nftName: string,
  hash: string,
  makerId: string,
  secret: string
) {
  const nftResponse = await connection.contract.Nft.createNft(
    nftName,
    hash,
    makerId,
    secret
  );
  expect(nftResponse).toHaveProperty('transactionId');

  await lib.onNewBlock(GNY_PORT);

  return nftResponse;
}

async function transferGNY(to: string, amount: string, secret: string) {
  const sendResponse = await connection.contract.Basic.send(to, amount, secret);
  expect(sendResponse).toHaveProperty('transactionId');

  await lib.onNewBlock(GNY_PORT);

  return sendResponse;
}

describe('nft', () => {
  beforeAll(async () => {
    await lib.stopOldInstances(DOCKER_COMPOSE_FILE, env);
    // do not build (this can run parallel)
    // await lib.buildDockerImage();
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnContainer(DOCKER_COMPOSE_FILE, env, GNY_PORT);
  }, lib.oneMinute);

  afterEach(async () => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
  }, lib.oneMinute);

  describe('Nft', () => {
    describe('nft maker', () => {
      it(
        'create one nft maker',
        async () => {
          expect.assertions(4);

          const nftmaker = 'mynftmaker';
          const desc = 'first nft maker';
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';

          const response = await registerNftMaker(nftmaker, desc, secret);

          const result = await connection.api.Nft.getNftMakers();
          // @ts-ignore
          expect(result.makers).toHaveLength(1);
          // @ts-ignore
          expect(result.makers[0]).toEqual({
            _version_: 1,
            desc: desc,
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            name: nftmaker,
            nftCounter: String(0),
            // @ts-ignore
            tid: response.transactionId,
          });

          const singleResponse = await connection.api.Nft.getSingleNftMaker(
            nftmaker
          );
          // @ts-ignore
          expect(singleResponse.maker).toEqual({
            _version_: 1,
            desc: desc,
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            name: nftmaker,
            nftCounter: String(0),
            // @ts-ignore
            tid: response.transactionId,
          });
        },
        lib.oneMinute
      );

      it(
        'get single nft maker by name',
        async () => {
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';

          const response1 = await registerNftMaker('A', 'desc', secret);
          const response2 = await registerNftMaker('B', 'desc', secret);

          const res1 = await connection.api.Nft.getSingleNftMaker('A');
          const res2 = await connection.api.Nft.getSingleNftMaker('B');

          // @ts-ignore
          console.log(JSON.stringify(res1, null, 1));

          // @ts-ignore
          expect(res1.maker).toEqual({
            name: 'A',
            desc: 'desc',
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            // @ts-ignore
            tid: response1.transactionId,
            nftCounter: String(0),
            _version_: 1,
          });

          // @ts-ignore
          expect(res2.maker).toEqual({
            name: 'B',
            desc: 'desc',
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            // @ts-ignore
            tid: response2.transactionId,
            nftCounter: String(0),
            _version_: 1,
          });
        },
        lib.oneMinute
      );

      it(
        'create multiple nft makers from different owners',
        async () => {
          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const genesisAddress = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

          const anotherSecret =
            'dragon despair shuffle vast donate exclude pair word mixed click rate ignore';
          const anotherAddress = 'G4EaQhF6kckgg9cHVcxf9VeQiEsTm';

          await transferGNY(anotherAddress, String(10000 * 1e8), genesisSecret);

          const prom1 = registerNftMaker('one', 'desc', genesisSecret);
          await lib.sleep(100);
          const prom2 = registerNftMaker('two', 'desc', anotherSecret);
          const [tid0, tid1] = await Promise.all([prom1, prom2]);

          const prom3 = registerNftMaker('three', 'desc', genesisSecret);
          await lib.sleep(100);
          const prom4 = registerNftMaker('four', 'desc', anotherSecret);
          const [tid2, tid3] = await Promise.all([prom3, prom4]);

          const res = await connection.api.Nft.getNftMakers(0, 100);
          expect(res.success).toEqual(true);
          // @ts-ignore
          expect(res.makers[0].address).toEqual(genesisAddress);
          // @ts-ignore
          expect(res.makers[0].name).toEqual('one');
          // @ts-ignore
          expect(res.makers[0].tid).toEqual(tid0.transactionId);

          // @ts-ignore
          expect(res.makers[1].address).toEqual(anotherAddress);
          // @ts-ignore
          expect(res.makers[1].name).toEqual('two');
          // @ts-ignore
          expect(res.makers[1].tid).toEqual(tid1.transactionId);

          // @ts-ignore
          expect(res.makers[2].address).toEqual(genesisAddress);
          // @ts-ignore
          expect(res.makers[2].name).toEqual('three');
          // @ts-ignore
          expect(res.makers[2].tid).toEqual(tid2.transactionId);

          // @ts-ignore
          expect(res.makers[3].address).toEqual(anotherAddress);
          // @ts-ignore
          expect(res.makers[3].name).toEqual('four');
          // @ts-ignore
          expect(res.makers[3].tid).toEqual(tid3.transactionId);

          const one = await connection.api.Nft.getNftMakers(0, 1);
          // @ts-ignore
          expect(one.makers).toHaveLength(1);
          // @ts-ignore
          expect(one.makers[0].name).toEqual('one');

          const two = await connection.api.Nft.getNftMakers(1, 1);
          // @ts-ignore
          expect(two.makers).toHaveLength(1);
          // @ts-ignore
          expect(two.makers[0].name).toEqual('two');

          const three = await connection.api.Nft.getNftMakers(2, 1);
          // @ts-ignore
          expect(three.makers).toHaveLength(1);
          // @ts-ignore
          expect(three.makers[0].name).toEqual('three');

          const four = await connection.api.Nft.getNftMakers(3, 1);
          // @ts-ignore
          expect(four.makers).toHaveLength(1);
          // @ts-ignore
          expect(four.makers[0].name).toEqual('four');
        },
        lib.oneMinute * 2
      );
    });

    describe('nft', () => {
      it(
        'create nft',
        async () => {
          // expect.assertions(1);
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';

          await registerNftMaker('mynftmaker', 'desc', secret);

          const firstNft = 'firstnft';
          const cid =
            'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
          const makerId = 'mynftmaker';

          const nftOne = await registerNft(firstNft, cid, makerId, secret);

          const result = await connection.api.Nft.getNfts();
          // @ts-ignore
          expect(result.nfts).toHaveLength(1);
          expect(result).toEqual({
            success: true,
            nfts: [
              {
                hash:
                  'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
                name: firstNft,
                counter: String(1),
                nftMakerId: 'mynftmaker',
                ownerAddress: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
                previousHash: null,
                // @ts-ignore
                tid: nftOne.transactionId,
                _version_: 1,
              },
            ],
          });

          // create second nft
          const secondNft = 'secondnft';
          const cid2 =
            'bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze';

          const nftTwo = await registerNft(secondNft, cid2, makerId, secret);
          expect(nftTwo).toHaveProperty('transactionId');

          const result2 = await connection.api.Nft.getNfts();
          // @ts-ignore
          expect(result2.nfts).toHaveLength(2);
          expect(result2).toEqual({
            success: true,
            nfts: [
              {
                hash:
                  'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
                name: firstNft,
                counter: String(1),
                nftMakerId: 'mynftmaker',
                ownerAddress: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
                previousHash: null,
                // @ts-ignore
                tid: nftOne.transactionId,
                _version_: 1,
              },
              {
                hash:
                  'bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze',
                name: secondNft,
                counter: String(2),
                nftMakerId: 'mynftmaker',
                ownerAddress: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
                previousHash:
                  'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
                // @ts-ignore
                tid: nftTwo.transactionId,
                _version_: 1,
              },
            ],
          });
        },
        lib.oneMinute * 2
      );

      it(
        'get nft by hash and name',
        async () => {
          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const genesisAddress = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

          const registerTrs = await registerNftMaker(
            'one',
            'desc',
            genesisSecret
          );

          const nft0 = await registerNft(
            'ONEONE',
            'bc21e6484530fc9d0313cb816b733396',
            'one',
            genesisSecret
          );
          await lib.sleep(100);
          const nft1 = await registerNft(
            'TWOTWO',
            '0f82d86afa0f5dc965c5c15aca58dcfb',
            'one',
            genesisSecret
          );

          // query first nft
          const res0_by_hash = await connection.api.Nft.getSingleNft({
            hash: 'bc21e6484530fc9d0313cb816b733396',
          });
          const expected0 = {
            _version_: 1,
            counter: String(1),
            hash: 'bc21e6484530fc9d0313cb816b733396',
            name: 'ONEONE',
            nftMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: null,
            // @ts-ignore
            tid: nft0.transactionId,
          };
          // @ts-ignore
          expect(res0_by_hash.nft).toEqual(expected0);
          const res0_by_name = await connection.api.Nft.getSingleNft({
            name: 'ONEONE',
          });
          // @ts-ignore
          expect(res0_by_name.nft).toEqual(expected0);

          // query second nft
          const res1_by_hash = await connection.api.Nft.getSingleNft({
            hash: '0f82d86afa0f5dc965c5c15aca58dcfb',
          });
          const expected1 = {
            _version_: 1,
            counter: String(2),
            hash: '0f82d86afa0f5dc965c5c15aca58dcfb',
            name: 'TWOTWO',
            nftMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: 'bc21e6484530fc9d0313cb816b733396',
            // @ts-ignore
            tid: nft1.transactionId,
          };
          // @ts-ignore
          expect(res1_by_hash.nft).toEqual(expected1);
          const res1_by_name = await connection.api.Nft.getSingleNft({
            name: 'TWOTWO',
          });
          // @ts-ignore
          expect(res1_by_name.nft).toEqual(expected1);
        },
        lib.oneMinute
      );

      it(
        'create multiple nfts from different makers',
        async () => {
          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const genesisAddress = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

          const anotherSecret =
            'dragon despair shuffle vast donate exclude pair word mixed click rate ignore';
          const anotherAddress = 'G4EaQhF6kckgg9cHVcxf9VeQiEsTm';

          await transferGNY(anotherAddress, String(10000 * 1e8), genesisSecret);

          const prom1 = registerNftMaker('one', 'desc', genesisSecret);
          await lib.sleep(100);
          const prom2 = registerNftMaker('two', 'desc', anotherSecret);
          const [tid0, tid1] = await Promise.all([prom1, prom2]);

          const promNft0 = registerNft(
            'NFTONE',
            '4beea259c4a1e6fe982e32a9988bee3d',
            'one',
            genesisSecret
          ); // md5sum
          await lib.sleep(100);
          const promNft1 = registerNft(
            'NFTTWO',
            'fceda27fd75e3fa76467646b8d3e7656',
            'two',
            anotherSecret
          );
          const [nft0, nft1] = await Promise.all([promNft0, promNft1]);

          const promNft2 = registerNft(
            'NFTTHREE',
            'f1cd9cc9830ae4ab330a7d7175032b10',
            'one',
            genesisSecret
          ); // md5sum
          await lib.sleep(100);
          const promNft3 = registerNft(
            'NFTFOUR',
            '0b719b7df84b7846237101b23bb9b91e',
            'two',
            anotherSecret
          );
          const [nft2, nft3] = await Promise.all([promNft2, promNft3]);

          const nftOne = await connection.api.Nft.getSingleNft({
            hash: '4beea259c4a1e6fe982e32a9988bee3d',
          });
          // @ts-ignore
          expect(nftOne.nft).toEqual({
            _version_: 1,
            counter: '1',
            hash: '4beea259c4a1e6fe982e32a9988bee3d',
            name: 'NFTONE',
            nftMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: null,
            // @ts-ignore
            tid: nft0.transactionId,
          });

          const nftTwo = await connection.api.Nft.getSingleNft({
            hash: 'fceda27fd75e3fa76467646b8d3e7656',
          });
          // @ts-ignore
          expect(nftTwo.nft).toEqual({
            _version_: 1,
            counter: '1',
            hash: 'fceda27fd75e3fa76467646b8d3e7656',
            name: 'NFTTWO',
            nftMakerId: 'two',
            ownerAddress: anotherAddress,
            previousHash: null,
            // @ts-ignore
            tid: nft1.transactionId,
          });

          const nftThree = await connection.api.Nft.getSingleNft({
            hash: 'f1cd9cc9830ae4ab330a7d7175032b10',
          });
          // @ts-ignore
          expect(nftThree.nft).toEqual({
            _version_: 1,
            counter: '2',
            hash: 'f1cd9cc9830ae4ab330a7d7175032b10',
            name: 'NFTTHREE',
            nftMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: '4beea259c4a1e6fe982e32a9988bee3d',
            // @ts-ignore
            tid: nft2.transactionId,
          });

          const nftFour = await connection.api.Nft.getSingleNft({
            hash: '0b719b7df84b7846237101b23bb9b91e',
          });
          // @ts-ignore
          expect(nftFour.nft).toEqual({
            _version_: 1,
            counter: '2',
            hash: '0b719b7df84b7846237101b23bb9b91e',
            name: 'NFTFOUR',
            nftMakerId: 'two',
            ownerAddress: anotherAddress,
            previousHash: 'fceda27fd75e3fa76467646b8d3e7656',
            // @ts-ignore
            tid: nft3.transactionId,
          });
        },
        lib.oneMinute
      );

      it(
        'can not create two nfts of same maker in one block',
        async () => {
          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const genesisAddress = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

          const reg1 = await registerNftMaker('one', 'desc', genesisSecret);
          // @ts-ignore
          expect(reg1).toHaveProperty('transactionId');

          /*
          start 2 nfts with the same makerId in the same block
          the second nft should return an error
        */
          // first nft
          const prom0 = registerNft(
            'FIRST',
            '2c2624a5059934a947d6e25fe8332ade',
            'one',
            genesisSecret
          );
          await lib.sleep(300);

          // second nft
          const prom1 = registerNft(
            'SECOND',
            '2200becb80f0019c4a2ccecec350d0db',
            'one',
            genesisSecret
          );
          expect(prom1).rejects.toHaveProperty('response.data', {
            success: false,
            error: 'Error: Lock name = nft.createNft@one exists already',
          });

          const res = await prom0;

          await lib.onNewBlock(GNY_PORT);

          const nfts = await connection.api.Nft.getNfts(0, 100);
          // @ts-ignore
          expect(nfts.nfts).toHaveLength(1);
          // @ts-ignore
          expect(nfts.nfts[0]).toEqual({
            _version_: 1,
            counter: String(1),
            hash: '2c2624a5059934a947d6e25fe8332ade',
            name: 'FIRST',
            nftMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: null,
            // @ts-ignore
            tid: res.transactionId,
          });

          const maker = await connection.api.Nft.getSingleNftMaker('one');
          // @ts-ignore
          expect(maker.maker).toEqual({
            _version_: 2,
            address: genesisAddress,
            desc: 'desc',
            name: 'one',
            nftCounter: '1',
            // @ts-ignore
            tid: reg1.transactionId,
          });
        },
        lib.oneMinute
      );
    });
  });
});
