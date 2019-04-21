import axios from 'axios';
import * as path from 'path';
import { fork } from 'child_process';

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

export async function onNewBlockAsync() {
  const firstHeight = await getHeight();
  let height: number;
  do {
    await sleep(2000);
    height = await getHeight();
  } while (height <= firstHeight);
}

export async function spawnNode() {
  const executionDir = path.join(process.cwd(), 'dist');
  const executionFile = path.join(process.cwd(), 'dist', 'app.js');
  const proc = fork(executionFile, undefined, {
    cwd: executionDir,
    stdio: [],
  });

  proc.on('error', err => {
    console.log(`err:${err.message}`);
  });

  proc.on('exit', function(code, signal) {
    console.log(
      'child process exited with ' + `code ${code} and signal ${signal}`
    );
  });

  await sleep(10000);

  let height = null;
  while (!height) {
    try {
      height = await getHeight();
    } catch (e) {
      height = null;
    }

    await sleep(2000);
  }
  return proc;
}
