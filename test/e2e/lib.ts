import axios from 'axios';
import { generateAddress } from '@gny/utils';
import { BigNumber } from 'bignumber.js';
import * as gnyJS from '@gny/client';
import * as crypto from 'crypto';
import shellJS from 'shelljs';
import { IBlock, KeyPair } from '@gny/interfaces';
// https://stackoverflow.com/a/70768410/5536304
// jest is changeing the global console object
import { log as consoleLog, error as consoleError } from 'console';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

function executeCmd(command: string) {
  shellJS.exec(command);
}

async function executeCmdAndPrint(command: string) {
  const before = Math.floor(new Date().valueOf() / 1000);

  const { stdout, stderr } = shellJS.exec(command, { silent: true });
  const after = Math.floor(new Date().valueOf() / 1000);

  consoleLog(`[${after - before}s]\n${command}`);
  if (typeof stderr === 'string' && stderr.length > 0) {
    consoleError(stderr);
  }
  if (typeof stdout === 'string' && stdout.length > 0) {
    consoleLog(stdout.trimStart());
  }
  await sleep(100);
}

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

export async function getBlock(port: number, height: string) {
  const url = `http://localhost:${port}/api/blocks/getBlock`;
  const { data } = await axios.get(url, {
    params: {
      height: height,
    },
  });
  return data.block as IBlock;
}

export async function getAccount(port: number, address: string) {
  const url = `http://localhost:${port}/api/accounts`;
  const { data } = await axios.get(url, {
    params: {
      address: address,
    },
  });
  return data;
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
  const before = Math.floor(new Date().valueOf() / 1000);

  let loaded = false;
  while (loaded === false) {
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
  const after = Math.floor(new Date().valueOf() / 1000);
  consoleLog(`[${after - before}s] waitet for port "${port}"`);
}

/**
 * This function finishes when the height of the node is >= 0
 * Very similar to function "waitForLoaded"
 * @param port of the node
 */
export async function waitForLoadedHeightZeroAllowed(port: number) {
  await sleep(100);
  const before = Math.floor(new Date().valueOf() / 1000);

  let loaded = false;
  while (loaded === false) {
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
  const after = Math.floor(new Date().valueOf() / 1000);
  consoleLog(`[${after - before}s] waitet for port "${port}"`);
}

export async function onNetworkDown(port: number) {
  function isNetworkError(err) {
    return !!err.isAxiosError && !err.response;
  }

  let down = false;
  while (down === false) {
    try {
      await getHeight(port);

      consoleLog(
        `[${new Date().toLocaleTimeString()}] network on  "${port}" still up...`
      );
      await sleep(1000);
    } catch (err) {
      if (isNetworkError(err)) {
        down = true;
      }
    }
  }
  consoleLog(`[${new Date().toLocaleTimeString()}] network down "${port}"`);
}

/**
 * This function finishes when the genesisBlock (height 0) via API can be reached
 * @param port of the node
 */
export async function waitForApiToBeReadyReady(port: number) {
  const before = Math.floor(new Date().valueOf() / 1000);

  let loaded = false;
  while (loaded === false) {
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
  const after = Math.floor(new Date().valueOf() / 1000);
  consoleLog(`[${after - before}s] waitet for port "${port}"`);
}

export async function stopAndRemoveOldContainersAndNetworks() {
  await executeCmdAndPrint('docker stop $(docker ps --all --quiet)');
  await executeCmdAndPrint('docker rm $(docker ps --all --quiet)');
  await executeCmdAndPrint('docker network prune --force');
}

export async function buildDockerImage(
  configFile: string = 'docker-compose.yml'
) {
  await executeCmdAndPrint(`docker-compose --file ${configFile} build --quiet`);
}

export async function createP2PContainersOnlyNoStarting(configFile: string) {
  await executeCmdAndPrint(
    `docker-compose --file "${configFile}" up --no-start`
  );
}

export function restoreBackup(
  configFile: string,
  backupFile: string,
  dbService: string
) {
  shellJS.exec(
    `cat ${backupFile} | docker exec -i ${dbService} psql -U postgres`
  );
}

export async function spawnP2PContainers(
  configFile: string = 'docker-compose.yml',
  ports = [4096]
) {
  const command = `docker-compose --file ${configFile} up --detach`;
  shellJS.exec(command);

  await sleep(10 * 1000);

  const waitForAllContainers = ports.map(x => waitForLoaded(x));
  await Promise.all(waitForAllContainers);
}

export async function spawnP2PContainersHeightZeroAllowed(
  configFile: string = 'docker-compose.yml',
  ports = [4096]
) {
  const command = `docker-compose --file ${configFile} up --detach`;
  shellJS.exec(command);

  await sleep(10 * 1000);

  const waitForAllContainers = ports.map(x =>
    waitForLoadedHeightZeroAllowed(x)
  );
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
  await executeCmdAndPrint(
    `docker-compose --file "${configFile}" stop --timeout=0 ${services.join(
      ' '
    )}`
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
  await executeCmdAndPrint(
    `docker-compose --file "${configFile}" up --detach ${services.join(' ')}`
  );
  await sleep(5000);
}

export async function stopAndKillContainer(
  configFile: string = 'docker-compose.yml'
) {
  shellJS.exec(`docker-compose ${configFile} down --volumes`, {
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

  // const logsDir = path.join(__dirname, '..', '..', 'logs');
  // fs.ensureDirSync(logsDir);

  // const fileName = `end2end-${e2eTestName}-${Date.now()}.log`;
  // const filePath = path.join(logsDir, fileName);

  // fs.writeFileSync(filePath, result.stdout, {
  //   encoding: 'utf8',
  // });
  // shellJS.exec(`chmod 777 -R ${logsDir}`);

  // log(`storing log file in "${filePath}"`);
}
