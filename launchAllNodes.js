const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const axios = require('axios');
const dockerCompose = require('docker-compose');
const isRoot = require('is-root');

if (!isRoot()) {
  console.log('please start this script as "sudo"');
  process.exit(1);
}

const DELAY = (ms = 5000) =>
  new Promise((resolve, reject) => setTimeout(resolve, ms));

(async () => {
  // fillter all dist directories __INCLUDING__ "dist"
  let distDirectories = fs
    .readdirSync(__dirname)
    .filter(item => RegExp('dist[1-9]*').test(item));

  if (distDirectories.length === 0 || distDirectories.length === 1) {
    console.log(
      'you need to run:\n\tnpm run tsc (and)\n\tnode createSecondNode [number]\t (to create extra nodes)'
    );
    process.exit(1);
  }

  distDirectories = distDirectories.map(item => path.join(__dirname, item));
  console.log(JSON.stringify(distDirectories, null, 2));

  const processes = [];

  for (let i = 0; i < distDirectories.length; ++i) {
    const dir = distDirectories[i];

    console.log(`starting docker services in: "${dir}`);
    await dockerCompose.down({ cwd: dir, log: true });
    await dockerCompose.upAll({
      cwd: dir,
      log: true,
      config: 'docker-compose.many.yml',
    });

    await DELAY(10000);
    console.log(`starting node in: ${dir}`);

    const proc = exec(
      'node app.js',
      {
        cwd: dir,
      },
      (err, stdout, stderr) => {
        console.log(
          `[${i}] node started; err: ${err}; stdout: ${stdout}; stderr: ${stderr}`
        );
      }
    );

    proc.stdout.on('data', data => {
      console.log(`[${i}] ${data.toString()}`);
    });
    processes.push(proc);
  }

  const interval = setInterval(async () => {
    await getHeights(distDirectories.length, 4096, 2);
  }, 10 * 1000);

  process.on('SIGINT', async () => {
    clearInterval(interval);
    console.log('received SIGTERM signal');
    const dirs = distDirectories;
    for (let i = 0; i < dirs.length; ++i) {
      const executionDir = dirs[i];
      await dockerCompose.stop({
        cwd: executionDir,
        log: true,
      });
    }
  });
})();

async function getHeights(numberOfNodes, startingPort, incrementPortBy) {
  try {
    const tasks = [];
    for (let i = 0; i < numberOfNodes; ++i) {
      const request = axios.get(
        `http://localhost:${startingPort}/api/blocks/getHeight`
      );
      tasks.push(request);

      startingPort += incrementPortBy;
    }

    const results = await Promise.all(tasks);
    const resultHeight = results.map(x => x.data);
    console.log(JSON.stringify(resultHeight));
  } catch (err) {
    console.log('error while requesting /blocks/getHeight');
  }
}
