import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import { BigNumber } from 'bignumber.js';

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

export async function stopAndKillContainer() {
  await dockerCompose.down({
    cwd: process.cwd(),
    log: true,
  });
}

export const oneMinute = 60 * 1000;
export const tenMinutes = 10 * 60 * 1000;
