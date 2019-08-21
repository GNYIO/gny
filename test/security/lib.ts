import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import * as Docker from 'dockerode';
import { randomBytes } from 'crypto';
import { generateAddress } from '../../src/utils/address';
import * as isRoot from 'is-root';
import { BigNumber } from 'bignumber.js';

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
  await dockerCompose.rm({
    cwd: process.cwd(),
    log: true,
  });
}

export async function buildDockerImage() {
  // first stop all running containers
  // then delete image file
  await dockerCompose.buildAll({
    cwd: process.cwd(),
    log: true,
  });
}

export async function spawnContainer() {
  await dockerCompose.upAll({
    cwd: process.cwd(),
    log: true,
  });
  await sleep(10 * 1000);
  await waitForLoaded();
}

export async function printActiveContainers() {
  const result = await dockerCompose.ps({
    cwd: process.cwd(),
    log: true,
  });
  await sleep(1000);
}

export async function stopAndKillContainer() {
  await dockerCompose.down({
    cwd: process.cwd(),
    log: true,
  });
}

export async function spawnPostgres() {
  await dockerCompose.upAll({
    cwd: process.cwd(),
    log: true,
    config: 'docker-compose.postgres.yml',
  });
  await sleep(10 * 1000);
}

export async function stopAndKillPostgres() {
  await dockerCompose.down({
    cwd: process.cwd(),
    log: true,
    config: 'docker-compose.postgres.yml',
  });
  await sleep(10 * 1000);
}

export function createRandomAddress() {
  const rand = randomBytes(10).toString('hex');
  return generateAddress(rand);
}
export const thirtySeconds = 30 * 1000;
export const oneMinute = 60 * 1000;
export const tenMinutes = 10 * 60 * 1000;

export function exitIfNotRoot() {
  if (!isRoot()) {
    process.exit(1);
  }
}
