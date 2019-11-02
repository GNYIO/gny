import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import { generateAddress } from '@gny/utils';
import { BigNumber } from '@gny/utils';
import * as gnyJS from '@gny/client';
import * as crypto from 'crypto';
import * as shellJS from 'shelljs';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

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

export async function waitForLoaded(port: number) {
  let loaded = false;
  while (loaded === false) {
    console.log('wait for ' + port);
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

export function createP2PContainersOnlyNoStarting(configFile: string) {
  shellJS.exec(`docker-compose --file "${configFile}" up --no-start`);
}

export async function spawnP2PContainers(configFile?: string, ports = [4096]) {
  // await dockerCompose
  await dockerCompose.upAll({
    cwd: process.cwd(),
    log: true,
    config: configFile,
  });
  await sleep(10 * 1000);

  const waitForAllContainers = ports.map(x => waitForLoaded(x));
  await Promise.all(waitForAllContainers);
}

export async function startP2PContainers(
  configFile: string,
  services: string[]
) {
  shellJS.exec(
    `docker-compose --file "${configFile}" start ${services.join(' ')}`
  );
  await sleep(5000);
}

export async function restartP2PContainers(
  configFile: string,
  services: string[]
) {
  console.log(`starting services: ${JSON.stringify(services)}`);
  await dockerCompose.restartMany(services, {
    config: configFile,
    cwd: process.cwd(),
  });
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
  const rand = crypto.randomBytes(10).toString('hex');
  return generateAddress(rand);
}

export function createRandomAccount() {
  interface ExtendedAccount {
    keypair: nacl.SignKeyPair;
    publicKey: string;
    privateKey: string;
    secret: string;
    address: string;
  }

  const secret = crypto.randomBytes(32).toString('hex');
  const partial: Pick<
    ExtendedAccount,
    'keypair' | 'publicKey' | 'privateKey'
  > = gnyJS.crypto.getKeys(secret);
  const full = {
    ...partial,
    address: gnyJS.crypto.getAddress(partial.publicKey),
    secret: secret,
  };
  return full;
}

export const thirtySeconds = 30 * 1000;
export const oneMinute = 60 * 1000;
export const tenMinutes = 10 * 60 * 1000;
