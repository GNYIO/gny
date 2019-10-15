import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import { randomBytes } from 'crypto';
import { generateAddress } from '@gny/utils';
import { BigNumber } from '@gny/utils';

export const GENESIS = {
  address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
  secret:
    'grow pencil ten junk bomb right describe trade rich valid tuna service',
};

export async function getHeight(port: number) {
  const url = `http://localhost:${port}/api/blocks/getHeight`;
  const { data } = await axios.get(url);
  return data.height as string;
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function onNewBlock(port: number = 4096) {
  const firstHeight = await getHeight(port);
  let height: string;
  do {
    await sleep(2000);
    height = await getHeight(port);
  } while (new BigNumber(height).isLessThanOrEqualTo(firstHeight));
  return height;
}

async function waitForLoaded(port: number) {
  let loaded = false;
  while (loaded === false) {
    console.log(`waitingForLoaded[${port}]`);
    try {
      const height = await getHeight(port);
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

export async function buildDockerImage(configFile?: string) {
  // first stop all running containers
  // then delete image file
  await dockerCompose.buildAll({
    cwd: process.cwd(),
    log: true,
    config: configFile,
  });
}

export async function spawnP2PContainers(configFile?: string, ports = [4096]) {
  await dockerCompose.upAll({
    cwd: process.cwd(),
    log: true,
    config: configFile,
  });
  await sleep(10 * 1000);

  const waitForAllContainers = ports.map(x => waitForLoaded(x));
  await Promise.all(waitForAllContainers);
}

export async function printActiveContainers() {
  const result = await dockerCompose.ps({
    cwd: process.cwd(),
    log: true,
  });
  await sleep(1000);
}

export async function stopAndKillContainer(configFile?: string) {
  await dockerCompose.down({
    cwd: process.cwd(),
    log: true,
    config: configFile,
  });
}

export function createRandomAddress(): string {
  const rand = randomBytes(10).toString('hex');
  return generateAddress(rand);
}

export const thirtySeconds = 30 * 1000;
export const oneMinute = 60 * 1000;
export const tenMinutes = 10 * 60 * 1000;
