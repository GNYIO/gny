import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import { randomBytes } from 'crypto';
import { generateAddress } from '@gny/utils';
import { BigNumber } from 'bignumber.js';
import * as shellJS from 'shelljs';

import pkg from 'pg';
const Client = pkg.Client;

const DEFAULT_DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.integration.yml';

export const GENESIS = {
  address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
  secret:
    'grow pencil ten junk bomb right describe trade rich valid tuna service',
};

export async function apiGetAsync(endpoint: string) {
  const result = await axios.get(`http://localhost:4096/api${endpoint}`);
  return result.data;
}

export async function getHeight() {
  const ret = await apiGetAsync('/blocks/getHeight');
  return ret.height as string;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function onNewBlock() {
  const firstHeight = await getHeight();
  let height: string;
  do {
    await sleep(2000);
    height = await getHeight();
  } while (new BigNumber(height).isLessThanOrEqualTo(firstHeight));
  return height;
}

async function waitForLoaded() {
  let loaded = false;
  while (loaded === false) {
    try {
      const height = await getHeight();
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

export async function deleteOldDockerImages() {
  const command =
    'docker stop $(docker ps --all --quiet); ' +
    'docker rm $(docker ps --all --quiet); ' +
    'docker network prune --force' +
    'docker volume prune --force';

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
  configFile: string = DEFAULT_DOCKER_COMPOSE_FILE
) {
  await dockerCompose.upAll({
    cwd: process.cwd(),
    log: true,
    config: configFile,
  });
  await waitForLoaded();
}

export async function printActiveContainers() {
  const result = await dockerCompose.ps({
    cwd: process.cwd(),
    log: true,
  });
  await sleep(1000);
}

export async function stopAndKillContainer(
  configFile: string = DEFAULT_DOCKER_COMPOSE_FILE
) {
  await dockerCompose.down({
    cwd: process.cwd(),
    log: true,
    commandOptions: ['--volumes', '--timeout=0'],
    config: configFile,
  });
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
  const statement = `CREATE DATABASE "${dbName}";`;
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
    DROP TABLE IF EXISTS "burn";
    DROP TABLE IF EXISTS "nft_maker";
    DROP TABLE IF EXISTS "nft";

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
