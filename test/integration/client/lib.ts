import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import { randomBytes } from 'crypto';
import { generateAddress } from '@gny/utils';
import { BigNumber } from '@gny/utils';
import * as shellJS from 'shelljs';
import { Client } from 'pg';
import * as pg from 'pg';

const DEFAULT_DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.integration.yml';

export const GENESIS = {
  address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
  secret:
    'grow pencil ten junk bomb right describe trade rich valid tuna service',
};

export async function apiGetAsync(gnyPort: number, endpoint: string) {
  const result = await axios.get(`http://localhost:${gnyPort}/api${endpoint}`);
  return result.data;
}

export async function getHeight(gnyPort: number) {
  const ret = await apiGetAsync(gnyPort, '/blocks/getHeight');
  return ret.height as string;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function onNewBlock(gnyPort: number) {
  const firstHeight = await getHeight(gnyPort);
  let height: string;
  do {
    await sleep(2000);
    height = await getHeight(gnyPort);
  } while (new BigNumber(height).isLessThanOrEqualTo(firstHeight));
  return height;
}

async function waitForLoaded(gnyPort: number) {
  let loaded = false;
  while (loaded === false) {
    try {
      const height = await getHeight(gnyPort);
      if (
        typeof height === 'string' &&
        new BigNumber(height).isGreaterThan(0)
      ) {
        loaded = true;
      }
    } catch (err) {}
    await sleep(1000);
  }
}

export async function waitUntilBlock(height: string) {
  let currentHeight = await getHeight();
  if (new BigNumber(height).isLessThanOrEqualTo(currentHeight)) {
    throw new Error(`the height "${height} was already reached`);
  }

  while (new BigNumber(currentHeight).isLessThanOrEqualTo(height)) {
    currentHeight = await getHeight();
    console.log(`currentHeight: ${currentHeight}`);
    await sleep(2000);
  }
}

export async function stopOldInstances(dockerFile: string, env: string) {
  const command = `${env} docker-compose --file ${dockerFile} down`;

  shellJS.exec(command, {
    silent: true,
  });
  console.log('\n');
}

export async function buildDockerImage(
  configFile: string = DEFAULT_DOCKER_COMPOSE_FILE
) {
  // first stop all running containers
  // then delete image file
  await dockerCompose.buildAll({
    cwd: process.cwd(),
    log: false,
    config: configFile,
  });
}

export async function spawnContainer(
  configFile: string = DEFAULT_DOCKER_COMPOSE_FILE,
  env: string,
  gnyPort: number
) {
  const command = `${env} docker-compose --file ${configFile} up --detach`;

  shellJS.exec(command, {
    silent: false,
  });
  console.log('\n');

  await waitForLoaded(gnyPort);
}

export async function stopAndKillContainer(
  configFile: string = DEFAULT_DOCKER_COMPOSE_FILE,
  env: string
) {
  const command = `
    ${env} docker-compose --file ${configFile} down --volumes --timeout=0
  `;

  shellJS.exec(command, {
    silent: false,
  });
  console.log('\n');
}

export async function spawnPostgres() {
  await dockerCompose.upAll({
    cwd: process.cwd(),
    log: true,
    config: 'config/integration/docker-compose.postgres.yml',
  });
  await sleep(10 * 1000);
}

export async function stopAndKillPostgres() {
  await dockerCompose.down({
    cwd: process.cwd(),
    log: true,
    config: 'config/integration/docker-compose.postgres.yml',
  });
  await sleep(10 * 1000);
}

export function createRandomAddress() {
  const rand = randomBytes(10).toString('hex');
  return generateAddress(rand);
}
export const thirtySeconds = 30 * 1000;
export const oneMinute = 60 * 1000;
export const tenSeconds = 10 * 1000;
export const tenMinutes = 10 * 60 * 1000;

export async function createDb(dbName: string) {
  // bad, better parameterize query
  const statement = `CREATE DATABASE ${dbName}`;
  const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    password: 'docker',
    port: 3456,
  });
  await client.connect();

  await client.query(statement);

  await client.end();
}

export async function dropDb(dbName: string) {
  const dropStatements = `DROP DATABASE IF EXISTS "${dbName}"`;

  const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    password: 'docker',
    port: 3456,
  });
  await client.connect();

  await client.query(dropStatements);

  await client.end();
}

export async function resetDb(dbName: string) {
  const dropStatements = `
    DROP TABLE IF EXISTS "account";
    DROP TABLE IF EXISTS "asset";
    DROP TABLE IF EXISTS "balance";
    DROP TABLE IF EXISTS "block";
    DROP TABLE IF EXISTS "block_history";
    DROP TABLE IF EXISTS "delegate";
    DROP TABLE IF EXISTS "issuer";
    DROP TABLE IF EXISTS "mldata";
    DROP TABLE IF EXISTS "prediction";
    DROP TABLE IF EXISTS "round";
    DROP TABLE IF EXISTS "transaction";
    DROP TABLE IF EXISTS "transfer";
    DROP TABLE IF EXISTS "variable";
    DROP TABLE IF EXISTS "vote";

    DROP TABLE IF EXISTS migrations;
    DROP SEQUENCE IF EXISTS migrations_id_seq;
  `;

  const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: dbName, // important
    password: 'docker',
    port: 3456,
  });
  await client.connect();

  await client.query(dropStatements);

  await client.end();
}

export function createEnvironmentVariables(
  gnyPort: number,
  appName: string,
  networkPrefix: string,
  exchangeFeature: boolean = false
) {
  const env = {
    COMPOSE_PROJECT_NAME: appName,
    NETWORK_PREFIX: networkPrefix,
    LOKI_PORT: Number(gnyPort) + 100,
    JAEGER_PORT_NR1: Number(gnyPort) + 10000,
    JAEGER_PORT_NR2: Number(gnyPort) + 12000,
    GNY_PORT_NR1: Number(gnyPort),
    GNY_PORT_NR2: Number(gnyPort) + 1,
    EXCHANGE_FEATURE: exchangeFeature,
  };

  const arr = Object.keys(env).map(x => {
    return `${x}=${env[x]}`;
  });

  return arr.join(' ');
}
