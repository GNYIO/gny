import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import { generateAddress } from '@gny/utils';
import { BigNumber } from '@gny/utils';
import * as gnyJS from '@gny/client';
import * as crypto from 'crypto';
import * as shellJS from 'shelljs';
import { KeyPair } from '@gny/interfaces';
import * as fs from 'fs-extra';
import * as path from 'path';

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

/**
 * This function finishes when the height of the node is > 0
 * @param port of the node
 */
export async function waitForLoaded(port: number) {
  let loaded = false;
  while (loaded === false) {
    console.log(`wait for ${port} (${Date.now()})`);
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

/**
 * This function finishes when the genesisBlock (height 0) via API can be reached
 * @param port of the node
 */
export async function waitForApiToBeReadyReady(port: number) {
  let loaded = false;
  while (loaded === false) {
    console.log(`wait for _ready_ ${port} (${Date.now()})`);
    try {
      const height = await getHeight(port);
      if (
        typeof height === 'string' &&
        new BigNumber(height).isGreaterThanOrEqualTo(0)
      ) {
        loaded = true;
      }
    } catch (err) {}
    await sleep(1000);
  }
}

export async function stopAndRemoveOldContainersAndNetworks() {
  const command =
    'docker stop $(sudo docker ps --all --quiet); ' +
    'docker rm $(sudo docker ps --all --quiet); ' +
    'docker network prune --force';

  shellJS.exec(command);
}

export async function buildDockerImage(configFile?: string) {
  // first stop all running containers
  // then delete image file
  console.log(`building "${configFile}"`);
  await dockerCompose.buildAll({
    cwd: process.cwd(),
    log: false,
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

export async function spawnP2pContainersSingle(
  configFile: string,
  services: string[]
) {
  shellJS.exec(
    `docker-compose --file "${configFile}" up --detach ${services.join(' ')}`
  );
  await sleep(5000);
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

export async function stopP2PContainers(
  configFile: string,
  services: string[]
) {
  shellJS.exec(
    `docker-compose --file "${configFile}" stop ${services.join(' ')}`
  );
  await sleep(5000);
}

export async function rmP2PContainers(configFile: string, services: string[]) {
  shellJS.exec(
    `docker-compose --file "${configFile}" rm --force ${services.join(' ')}`
  );
  await sleep(5000);
}

export async function upP2PContainers(configFile: string, services: string[]) {
  shellJS.exec(
    `docker-compose --file "${configFile}" up --detach ${services.join(' ')}`
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
  const file = configFile ? `--file ${configFile}` : '';
  shellJS.exec(`docker-compose ${file} down --volumes`, {
    silent: true,
  });
  await sleep(20 * 1000);
}

export function createRandomAddress(): string {
  const rand = crypto.randomBytes(10).toString('hex');
  return generateAddress(rand);
}

export function createRandomAccount() {
  interface ExtendedAccount {
    keypair: KeyPair;
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

export function getLogsOfAllServices(configFile: string, e2eTestName: string) {
  const result = shellJS.exec(
    `docker-compose --file ${configFile} logs --no-color --timestamp | sort -k3,3`,
    {
      silent: true,
    }
  );

  const logsDir = path.join(__dirname, '..', '..', 'logs');
  fs.ensureDirSync(logsDir);

  const fileName = `end2end-${e2eTestName}-${Date.now()}.log`;
  const filePath = path.join(logsDir, fileName);

  fs.writeFileSync(filePath, result.stdout, {
    encoding: 'utf8',
  });
  // change permissions of entiry directory
  shellJS.exec(`sudo chmod 777 -R ${logsDir}`);

  console.log(`storing log file in "${filePath}"`);
}
