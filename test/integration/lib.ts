import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import * as Docker from 'dockerode';
import { randomBytes } from 'crypto';
import { generateAddress } from '../../src/utils/address';
import * as isRoot from 'is-root';

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
  return ret.height;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function onNewBlock() {
  const firstHeight = await getHeight();
  let height: number;
  do {
    await sleep(2000);
    height = await getHeight();
  } while (height <= firstHeight);
  return height;
}

async function waitForLoaded() {
  let loaded = false;
  while (loaded === false) {
    try {
      const height = await getHeight();
      if (typeof height === 'number' && height > 0) {
        loaded = true;
      }
    } catch (err) {}
    await sleep(1000);
  }
}

export async function waitUntilBlock(height: number) {
  let currentHeight = await getHeight();
  if (height <= currentHeight) {
    throw new Error(`the height "${height} was already reached`);
  }

  while (currentHeight <= height) {
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

export async function spawnOnlyDbContainer() {
  const docker = new Docker();

  return new Promise((resolve, reject) => {
    const emitter = docker.run(
      'postgres:9.6.12',
      undefined,
      process.stdout,
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    // wait for container and return it
    emitter.once('container', container => {
      console.log(`container: ${JSON.stringify(container, null, 2)}`);
      resolve(container);
    });
  });
}

export async function stopAndRemoveOnlyDbContainer(
  container: Docker.Container
) {
  await container.kill();
  await sleep(10 * 1000);
}

export function createRandomAddress() {
  const rand = randomBytes(10).toString('hex');
  return generateAddress(rand);
}
export const oneMinute = 60 * 1000;
export const tenMinutes = 10 * 60 * 1000;

export function exitIfNotRoot() {
  if (!isRoot()) {
    process.exit(1);
  }
}
