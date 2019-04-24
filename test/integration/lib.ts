import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import * as Docker from 'dockerode';
import { randomBytes } from 'crypto';

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

export async function buildDockerImage() {
  // first stop all running containers
  // then delete image file
  await dockerCompose.buildAll({
    cwd: process.cwd(),
    log: false,
    config: ['--no-cache'],
  });
}

export async function spawnContainer() {
  await dockerCompose.upAll({
    cwd: process.cwd(),
    log: false,
  });
  await sleep(10 * 1000);
  await waitForLoaded();
}

export async function stopAndKillContainer() {
  await dockerCompose.down({
    cwd: process.cwd(),
    log: false,
  });
}

export async function spawnOnlyDbContainer() {
  const docker = new Docker();

  return await docker.run('postgres:9.6.12', [], process.stdin, {
    // Volumes: {[__dirname]: {}},
    name: 'smartDB_integration_testing',
    HostConfig: {
      // Binds: [__dirname + ":/stuff"],
      // ShmSize: 1000000000,
      Privileged: true,
      AutoRemove: true,
      PortBindings: {
        '5432/tcp': [
          {
            HostPort: '4000',
          },
        ],
      },
    },
    Env: [
      'POSTGRES_PASSWORD=docker',
      'POSTGRES_DB=postgres',
      'POSTGRES_USER=postgres',
    ],
  });

  const container = await docker.createContainer({
    Image: 'postgres:9.6.12',
    name: randomBytes(32).toString('hex'),
    HostConfig: {
      Privileged: true,
      AutoRemove: true,
      PortBindings: {
        '5432/tcp': [
          {
            HostPort: '4000',
          },
        ],
      },
    },
    Env: [
      'POSTGRES_PASSWORD=docker',
      'POSTGRES_DB=postgres',
      'POSTGRES_USER=postgres',
    ],
  });
  await container.start();
  return container;
}

export async function stopAndRemoveOnlyDbContainer(
  container: Docker.Container
) {
  await container.kill();
  await sleep(10 * 1000);
}
