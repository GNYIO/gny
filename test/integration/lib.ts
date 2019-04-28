import axios from 'axios';
import * as dockerCompose from 'docker-compose';
import * as Docker from 'dockerode';

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
