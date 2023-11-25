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

async function registerDatMaker(
  name: string,
  description: string,
  secret: string
) {
  const makerResponse = await connection.contract.Dat.registerDatMaker(
    name,
    description,
    secret
  );
  expect(makerResponse).toHaveProperty('transactionId');

  await lib.onNewBlock(GNY_PORT);

  return makerResponse;
}

async function registerDat(
  datName: string,
  hash: string,
  makerId: string,
  url: string,
  secret: string
) {
  const datResponse = await connection.contract.Dat.createDat(
    datName,
    hash,
    makerId,
    url,
    secret
  );
  expect(datResponse).toHaveProperty('transactionId');

  await lib.onNewBlock(GNY_PORT);

  return datResponse;
}

async function transferGNY(to: string, amount: string, secret: string) {
  const sendResponse = await connection.contract.Basic.send(to, amount, secret);
  expect(sendResponse).toHaveProperty('transactionId');

  await lib.onNewBlock(GNY_PORT);

  return sendResponse;
}

describe('dat', () => {
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

  describe('Dat', () => {
    describe('dat maker', () => {
      it(
        'create one dat maker',
        async () => {
          expect.assertions(4);

          const datmaker = 'mydatmaker';
          const desc = 'first dat maker';
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';

          const response = await registerDatMaker(datmaker, desc, secret);

          const result = await connection.api.Dat.getDatMakers();
          // @ts-ignore
          expect(result.makers).toHaveLength(1);
          // @ts-ignore
          expect(result.makers[0]).toEqual({
            _version_: 1,
            desc: desc,
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            name: datmaker,
            datCounter: String(0),
            // @ts-ignore
            tid: response.transactionId,
          });

          const singleResponse = await connection.api.Dat.getSingleDatMaker(
            datmaker
          );
          // @ts-ignore
          expect(singleResponse.maker).toEqual({
            _version_: 1,
            desc: desc,
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            name: datmaker,
            datCounter: String(0),
            // @ts-ignore
            tid: response.transactionId,
          });
        },
        lib.oneMinute
      );

      it(
        'get single dat maker by name',
        async () => {
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';

          const response1 = await registerDatMaker('A', 'desc', secret);
          const response2 = await registerDatMaker('B', 'desc', secret);

          const res1 = await connection.api.Dat.getSingleDatMaker('A');
          const res2 = await connection.api.Dat.getSingleDatMaker('B');

          // @ts-ignore
          expect(res1.maker).toEqual({
            name: 'A',
            desc: 'desc',
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            // @ts-ignore
            tid: response1.transactionId,
            datCounter: String(0),
            _version_: 1,
          });

          // @ts-ignore
          expect(res2.maker).toEqual({
            name: 'B',
            desc: 'desc',
            address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            // @ts-ignore
            tid: response2.transactionId,
            datCounter: String(0),
            _version_: 1,
          });
        },
        lib.oneMinute
      );

      it(
        'create multiple dat makers from different owners',
        async () => {
          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const genesisAddress = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

          const anotherSecret =
            'dragon despair shuffle vast donate exclude pair word mixed click rate ignore';
          const anotherAddress = 'G4EaQhF6kckgg9cHVcxf9VeQiEsTm';

          await transferGNY(anotherAddress, String(10000 * 1e8), genesisSecret);

          const prom1 = registerDatMaker('one', 'desc', genesisSecret);
          await lib.sleep(100);
          const prom2 = registerDatMaker('two', 'desc', anotherSecret);
          const [tid0, tid1] = await Promise.all([prom1, prom2]);

          const prom3 = registerDatMaker('three', 'desc', genesisSecret);
          await lib.sleep(100);
          const prom4 = registerDatMaker('four', 'desc', anotherSecret);
          const [tid2, tid3] = await Promise.all([prom3, prom4]);

          const res = await connection.api.Dat.getDatMakers(0, 100);
          expect(res.success).toEqual(true);
          // @ts-ignore
          expect(res.makers[0].address).toEqual(genesisAddress);
          // @ts-ignore
          expect(res.makers[0].name).toEqual('one');
          // @ts-ignore
          expect(res.makers[0].tid).toEqual(tid0.transactionId);
          // @ts-ignore
          expect(res.makers[0].datCounter).toEqual(String(0));

          // @ts-ignore
          expect(res.makers[1].address).toEqual(anotherAddress);
          // @ts-ignore
          expect(res.makers[1].name).toEqual('two');
          // @ts-ignore
          expect(res.makers[1].tid).toEqual(tid1.transactionId);
          // @ts-ignore
          expect(res.makers[1].datCounter).toEqual(String(0));

          // @ts-ignore
          expect(res.makers[2].address).toEqual(genesisAddress);
          // @ts-ignore
          expect(res.makers[2].name).toEqual('three');
          // @ts-ignore
          expect(res.makers[2].tid).toEqual(tid2.transactionId);
          // @ts-ignore
          expect(res.makers[2].datCounter).toEqual(String(0));

          // @ts-ignore
          expect(res.makers[3].address).toEqual(anotherAddress);
          // @ts-ignore
          expect(res.makers[3].name).toEqual('four');
          // @ts-ignore
          expect(res.makers[3].tid).toEqual(tid3.transactionId);
          // @ts-ignore
          expect(res.makers[3].datCounter).toEqual(String(0));

          const one = await connection.api.Dat.getDatMakers(0, 1);
          // @ts-ignore
          expect(one.makers).toHaveLength(1);
          // @ts-ignore
          expect(one.makers[0].name).toEqual('one');

          const two = await connection.api.Dat.getDatMakers(1, 1);
          // @ts-ignore
          expect(two.makers).toHaveLength(1);
          // @ts-ignore
          expect(two.makers[0].name).toEqual('two');

          const three = await connection.api.Dat.getDatMakers(2, 1);
          // @ts-ignore
          expect(three.makers).toHaveLength(1);
          // @ts-ignore
          expect(three.makers[0].name).toEqual('three');

          const four = await connection.api.Dat.getDatMakers(3, 1);
          // @ts-ignore
          expect(four.makers).toHaveLength(1);
          // @ts-ignore
          expect(four.makers[0].name).toEqual('four');

          /**
           * now test /api/dat/makers endpoint and filtering by address
           */

          const onlyDatMakersFromGenesisAddressFirst = await connection.api.Dat.getDatMakers(
            0,
            1,
            genesisAddress
          );

          // @ts-ignore
          expect(onlyDatMakersFromGenesisAddressFirst.makers).toHaveLength(1);
          // @ts-ignore
          expect(onlyDatMakersFromGenesisAddressFirst.count).toEqual(2);
          // @ts-ignore
          expect(onlyDatMakersFromGenesisAddressFirst.makers[0].tid).toEqual(
            // @ts-ignore
            tid0.transactionId
          );
          // @ts-ignore
          expect(onlyDatMakersFromGenesisAddressFirst.makers[0].name).toEqual(
            'one'
          );

          const onlyDatMakersFromAnotherAddressFirst = await connection.api.Dat.getDatMakers(
            0,
            1,
            anotherAddress
          );
          // @ts-ignore
          expect(onlyDatMakersFromAnotherAddressFirst.makers).toHaveLength(1);
          // @ts-ignore
          expect(onlyDatMakersFromAnotherAddressFirst.count).toEqual(2);
          // @ts-ignore
          expect(onlyDatMakersFromAnotherAddressFirst.makers[0].tid).toEqual(
            // @ts-ignore
            tid1.transactionId
          );
          // @ts-ignore
          expect(onlyDatMakersFromAnotherAddressFirst.makers[0].name).toEqual(
            'two'
          );

          const onlyDatMakersFromGenesisAddressSecond = await connection.api.Dat.getDatMakers(
            1,
            1,
            genesisAddress
          );

          // @ts-ignore
          expect(onlyDatMakersFromGenesisAddressSecond.makers).toHaveLength(1);
          // @ts-ignore
          expect(onlyDatMakersFromGenesisAddressSecond.count).toEqual(2);
          // @ts-ignore
          expect(onlyDatMakersFromGenesisAddressSecond.makers[0].tid).toEqual(
            // @ts-ignore
            tid2.transactionId
          );
          // @ts-ignore
          expect(onlyDatMakersFromGenesisAddressSecond.makers[0].name).toEqual(
            'three'
          );

          const onlyDatMakersFromAnotherAddressSecond = await connection.api.Dat.getDatMakers(
            1,
            1,
            anotherAddress
          );
          // @ts-ignore
          expect(onlyDatMakersFromAnotherAddressSecond.makers).toHaveLength(1);
          // @ts-ignore
          expect(onlyDatMakersFromAnotherAddressSecond.count).toEqual(2);
          // @ts-ignore
          expect(onlyDatMakersFromAnotherAddressSecond.makers[0].tid).toEqual(
            // @ts-ignore
            tid3.transactionId
          );
          // @ts-ignore
          expect(onlyDatMakersFromAnotherAddressSecond.makers[0].name).toEqual(
            'four'
          );
        },
        lib.oneMinute * 2
      );
    });

    describe('dat', () => {
      it(
        'create dat',
        async () => {
          // expect.assertions(1);
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';

          await registerDatMaker('mydatmaker', 'desc', secret);

          const firstDat = 'firstdat';
          const cid =
            'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
          const makerId = 'mydatmaker';

          const datOne = await registerDat(
            firstDat,
            cid,
            makerId,
            `https://test.com/${cid}`,
            secret
          );

          const result = await connection.api.Dat.getDats();
          // @ts-ignore
          expect(result.dats).toHaveLength(1);
          expect(result).toEqual({
            success: true,
            count: 1,
            dats: [
              {
                hash:
                  'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
                name: firstDat,
                counter: String(1),
                datMakerId: 'mydatmaker',
                ownerAddress: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
                previousHash: null,
                // @ts-ignore
                tid: datOne.transactionId,
                timestamp: expect.toBeNumber(),
                url:
                  'https://test.com/bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
                _version_: 1,
              },
            ],
          });

          // create second dat
          const secondDat = 'seconddat';
          const cid2 =
            'bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze';

          const datTwo = await registerDat(
            secondDat,
            cid2,
            makerId,
            `https://test.com/${cid2}`,
            secret
          );
          expect(datTwo).toHaveProperty('transactionId');

          const result2 = await connection.api.Dat.getDats();
          // @ts-ignore
          expect(result2.dats).toHaveLength(2);
          expect(result2).toEqual({
            success: true,
            count: 2,
            dats: [
              {
                hash:
                  'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
                name: firstDat,
                counter: String(1),
                datMakerId: 'mydatmaker',
                ownerAddress: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
                previousHash: null,
                // @ts-ignore
                tid: datOne.transactionId,
                timestamp: expect.toBeNumber(),
                url:
                  'https://test.com/bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
                _version_: 1,
              },
              {
                hash:
                  'bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze',
                name: secondDat,
                counter: String(2),
                datMakerId: 'mydatmaker',
                ownerAddress: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
                previousHash:
                  'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
                // @ts-ignore
                tid: datTwo.transactionId,
                timestamp: expect.toBeNumber(),
                url:
                  'https://test.com/bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze',
                _version_: 1,
              },
            ],
          });

          const maker = await connection.api.Dat.getSingleDatMaker(
            'mydatmaker'
          );
          // @ts-ignore
          expect(maker.maker.datCounter).toEqual(String(2));
        },
        lib.oneMinute * 2
      );

      it(
        'get dat by hash and name',
        async () => {
          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const genesisAddress = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

          const registerTrs = await registerDatMaker(
            'one',
            'desc',
            genesisSecret
          );

          const dat0 = await registerDat(
            'ONEONE',
            'bc21e6484530fc9d0313cb816b733396',
            'one',
            'https://test.com/bc21e6484530fc9d0313cb816b733396',
            genesisSecret
          );
          await lib.sleep(100);
          const dat1 = await registerDat(
            'TWOTWO',
            '0f82d86afa0f5dc965c5c15aca58dcfb',
            'one',
            'https://test.com/0f82d86afa0f5dc965c5c15aca58dcfb',
            genesisSecret
          );

          // query first dat
          const res0_by_hash = await connection.api.Dat.getSingleDat({
            hash: 'bc21e6484530fc9d0313cb816b733396',
          });
          const expected0 = {
            _version_: 1,
            counter: String(1),
            hash: 'bc21e6484530fc9d0313cb816b733396',
            name: 'ONEONE',
            datMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: null,
            // @ts-ignore
            tid: dat0.transactionId,
            timestamp: expect.toBeNumber(),
            url: 'https://test.com/bc21e6484530fc9d0313cb816b733396',
          };
          // @ts-ignore
          expect(res0_by_hash.dat).toEqual(expected0);
          const res0_by_name = await connection.api.Dat.getSingleDat({
            name: 'ONEONE',
          });
          // @ts-ignore
          expect(res0_by_name.dat).toEqual(expected0);

          // query second dat
          const res1_by_hash = await connection.api.Dat.getSingleDat({
            hash: '0f82d86afa0f5dc965c5c15aca58dcfb',
          });
          const expected1 = {
            _version_: 1,
            counter: String(2),
            hash: '0f82d86afa0f5dc965c5c15aca58dcfb',
            name: 'TWOTWO',
            datMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: 'bc21e6484530fc9d0313cb816b733396',
            // @ts-ignore
            tid: dat1.transactionId,
            timestamp: expect.toBeNumber(),
            url: 'https://test.com/0f82d86afa0f5dc965c5c15aca58dcfb',
          };
          // @ts-ignore
          expect(res1_by_hash.dat).toEqual(expected1);
          const res1_by_name = await connection.api.Dat.getSingleDat({
            name: 'TWOTWO',
          });
          // @ts-ignore
          expect(res1_by_name.dat).toEqual(expected1);

          const maker = await connection.api.Dat.getSingleDatMaker('one');
          // @ts-ignore
          expect(maker.maker.datCounter).toEqual(String(2));
        },
        lib.oneMinute
      );

      it(
        'create multiple dats from different makers',
        async () => {
          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const genesisAddress = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

          const anotherSecret =
            'dragon despair shuffle vast donate exclude pair word mixed click rate ignore';
          const anotherAddress = 'G4EaQhF6kckgg9cHVcxf9VeQiEsTm';

          await transferGNY(anotherAddress, String(10000 * 1e8), genesisSecret);

          const prom1 = registerDatMaker('one', 'desc', genesisSecret);
          await lib.sleep(100);
          const prom2 = registerDatMaker('two', 'desc', anotherSecret);
          const [tid0, tid1] = await Promise.all([prom1, prom2]);

          const promDat0 = registerDat(
            'NFTONE',
            '4beea259c4a1e6fe982e32a9988bee3d',
            'one',
            'https://test.com/4beea259c4a1e6fe982e32a9988bee3d',
            genesisSecret
          ); // md5sum
          await lib.sleep(100);
          const promDat1 = registerDat(
            'NFTTWO',
            'fceda27fd75e3fa76467646b8d3e7656',
            'two',
            'https://test.com/fceda27fd75e3fa76467646b8d3e7656',
            anotherSecret
          );
          const [dat0, dat1] = await Promise.all([promDat0, promDat1]);

          const promDat2 = registerDat(
            'NFTTHREE',
            'f1cd9cc9830ae4ab330a7d7175032b10',
            'one',
            'https://test.com/f1cd9cc9830ae4ab330a7d7175032b10',
            genesisSecret
          ); // md5sum
          await lib.sleep(100);
          const promDat3 = registerDat(
            'NFTFOUR',
            '0b719b7df84b7846237101b23bb9b91e',
            'two',
            'https://test.com/0b719b7df84b7846237101b23bb9b91e',
            anotherSecret
          );
          const [dat2, dat3] = await Promise.all([promDat2, promDat3]);

          const datOne = await connection.api.Dat.getSingleDat({
            hash: '4beea259c4a1e6fe982e32a9988bee3d',
          });
          // @ts-ignore
          expect(datOne.dat).toEqual({
            _version_: 1,
            counter: '1',
            hash: '4beea259c4a1e6fe982e32a9988bee3d',
            name: 'NFTONE',
            datMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: null,
            // @ts-ignore
            tid: dat0.transactionId,
            timestamp: expect.toBeNumber(),
            url: 'https://test.com/4beea259c4a1e6fe982e32a9988bee3d',
          });

          const datTwo = await connection.api.Dat.getSingleDat({
            hash: 'fceda27fd75e3fa76467646b8d3e7656',
          });
          // @ts-ignore
          expect(datTwo.dat).toEqual({
            _version_: 1,
            counter: '1',
            hash: 'fceda27fd75e3fa76467646b8d3e7656',
            name: 'NFTTWO',
            datMakerId: 'two',
            ownerAddress: anotherAddress,
            previousHash: null,
            // @ts-ignore
            tid: dat1.transactionId,
            timestamp: expect.toBeNumber(),
            url: 'https://test.com/fceda27fd75e3fa76467646b8d3e7656',
          });

          const datThree = await connection.api.Dat.getSingleDat({
            hash: 'f1cd9cc9830ae4ab330a7d7175032b10',
          });
          // @ts-ignore
          expect(datThree.dat).toEqual({
            _version_: 1,
            counter: '2',
            hash: 'f1cd9cc9830ae4ab330a7d7175032b10',
            name: 'NFTTHREE',
            datMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: '4beea259c4a1e6fe982e32a9988bee3d',
            // @ts-ignore
            tid: dat2.transactionId,
            timestamp: expect.toBeNumber(),
            url: 'https://test.com/f1cd9cc9830ae4ab330a7d7175032b10',
          });

          const datFour = await connection.api.Dat.getSingleDat({
            hash: '0b719b7df84b7846237101b23bb9b91e',
          });
          // @ts-ignore
          expect(datFour.dat).toEqual({
            _version_: 1,
            counter: '2',
            hash: '0b719b7df84b7846237101b23bb9b91e',
            name: 'NFTFOUR',
            datMakerId: 'two',
            ownerAddress: anotherAddress,
            previousHash: 'fceda27fd75e3fa76467646b8d3e7656',
            // @ts-ignore
            tid: dat3.transactionId,
            timestamp: expect.toBeNumber(),
            url: 'https://test.com/0b719b7df84b7846237101b23bb9b91e',
          });

          // check that the counter has increased maker
          const makers = await connection.api.Dat.getDatMakers(0, 100);
          // @ts-ignore
          expect(makers.makers).toHaveLength(2);

          // @ts-ignore
          expect(makers.makers[0].name).toEqual('one');
          // @ts-ignore
          expect(makers.makers[0].datCounter).toEqual(String(2));

          // @ts-ignore
          expect(makers.makers[1].name).toEqual('two');
          // @ts-ignore
          expect(makers.makers[1].datCounter).toEqual(String(2));

          const ntfsFromGenesis = await connection.api.Dat.getDats({
            maker: 'one',
          });
          // @ts-ignore
          expect(ntfsFromGenesis.count).toEqual(2);
          // @ts-ignore
          expect(ntfsFromGenesis.dats).toEqual([
            {
              _version_: 1,
              counter: '1',
              hash: '4beea259c4a1e6fe982e32a9988bee3d',
              name: 'NFTONE',
              datMakerId: 'one',
              ownerAddress: genesisAddress,
              previousHash: null,
              // @ts-ignore
              tid: dat0.transactionId,
              timestamp: expect.any(Number),
              url: 'https://test.com/4beea259c4a1e6fe982e32a9988bee3d',
            },
            {
              _version_: 1,
              counter: '2',
              hash: 'f1cd9cc9830ae4ab330a7d7175032b10',
              name: 'NFTTHREE',
              datMakerId: 'one',
              ownerAddress: genesisAddress,
              previousHash: '4beea259c4a1e6fe982e32a9988bee3d',
              // @ts-ignore
              tid: dat2.transactionId,
              timestamp: expect.any(Number),
              url: 'https://test.com/f1cd9cc9830ae4ab330a7d7175032b10',
            },
          ]);

          const datsFromAnother = await connection.api.Dat.getDats({
            ownerAddress: anotherAddress,
          });
          // @ts-ignore
          expect(datsFromAnother.count).toEqual(2);
          // @ts-ignore
          expect(datsFromAnother.dats).toEqual([
            {
              _version_: 1,
              counter: '1',
              hash: 'fceda27fd75e3fa76467646b8d3e7656',
              name: 'NFTTWO',
              datMakerId: 'two',
              ownerAddress: anotherAddress,
              previousHash: null,
              // @ts-ignore
              tid: dat1.transactionId,
              timestamp: expect.any(Number),
              url: 'https://test.com/fceda27fd75e3fa76467646b8d3e7656',
            },
            {
              _version_: 1,
              counter: '2',
              hash: '0b719b7df84b7846237101b23bb9b91e',
              name: 'NFTFOUR',
              datMakerId: 'two',
              ownerAddress: anotherAddress,
              previousHash: 'fceda27fd75e3fa76467646b8d3e7656',
              // @ts-ignore
              tid: dat3.transactionId,
              timestamp: expect.any(Number),
              url: 'https://test.com/0b719b7df84b7846237101b23bb9b91e',
            },
          ]);
        },
        lib.oneMinute
      );

      it(
        'can not create two dats of same maker in one block',
        async () => {
          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const genesisAddress = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

          const reg1 = await registerDatMaker('one', 'desc', genesisSecret);
          // @ts-ignore
          expect(reg1).toHaveProperty('transactionId');

          /*
            start 2 dats with the same makerId in the same block
            the second dat should return an error
          */
          // first dat
          const prom0 = registerDat(
            'FIRST',
            '2c2624a5059934a947d6e25fe8332ade',
            'one',
            'https://test.com/2c2624a5059934a947d6e25fe8332ade',
            genesisSecret
          );
          await lib.sleep(300);

          // second dat
          const prom1 = registerDat(
            'SECOND',
            '2200becb80f0019c4a2ccecec350d0db',
            'one',
            'https://test.com/2200becb80f0019c4a2ccecec350d0db',
            genesisSecret
          );
          expect(prom1).rejects.toHaveProperty('response.data', {
            success: false,
            error: 'Error: Lock name = dat.createDat@one exists already',
          });

          const res = await prom0;

          await lib.onNewBlock(GNY_PORT);

          const dats = await connection.api.Dat.getDats({
            offset: 0,
            limit: 100,
          });
          // @ts-ignore
          expect(dats.dats).toHaveLength(1);
          // @ts-ignore
          expect(dats.count).toEqual(1);
          // @ts-ignore
          expect(dats.dats[0]).toEqual({
            _version_: 1,
            counter: String(1),
            hash: '2c2624a5059934a947d6e25fe8332ade',
            name: 'FIRST',
            datMakerId: 'one',
            ownerAddress: genesisAddress,
            previousHash: null,
            // @ts-ignore
            tid: res.transactionId,
            timestamp: expect.toBeNumber(),
            url: 'https://test.com/2c2624a5059934a947d6e25fe8332ade',
          });

          const maker = await connection.api.Dat.getSingleDatMaker('one');
          // @ts-ignore
          expect(maker.maker).toEqual({
            _version_: 2,
            address: genesisAddress,
            desc: 'desc',
            name: 'one',
            datCounter: '1',
            // @ts-ignore
            tid: reg1.transactionId,
          });
        },
        lib.oneMinute
      );
    });
  });
});
