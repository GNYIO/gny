const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const axios = require('axios');

const DELAY = (ms = 5000) => new Promise((resolve, reject) => setTimeout(resolve, ms));

(async () => {
  // fillter all dist directories __INCLUDING__ "dist"
  let distDirectories = fs.readdirSync(__dirname)
    .filter((item) => RegExp('dist[1-9]*').test(item));

  if (distDirectories.length === 0 || distDirectories.length === 1) {
    console.log('you need to run:\n\tnpm run tsc (and)\n\tnode createSecondNode [number]\t (to create extra nodes)')
    process.exit(1);
  }

  distDirectories = distDirectories.map(item => path.join(__dirname, item));
  console.log(JSON.stringify(distDirectories, null, 2));


  const processes = [];

  for (let i = 0; i < distDirectories.length; ++i) {
    const dir = distDirectories[i];

    // give the first node more time to start
    if (i === 0) {
      console.log('starting boot node')
      await DELAY(10000);
    } else {
      await DELAY(100);
      console.log(`starting node in: ${dir}`);
    }

    const proc = exec('node app.js', {
      cwd: dir,
     }, (err, stdout, stderr) => {
       console.log(`${i} node started`);

     });

     proc.stdout.on('data', (data) => {
      console.log(`[${i}] ${data.toString()}`);
     })
     processes.push(proc);
  }



  setInterval(async () => {
    try {
      const result = await axios.get('http://localhost:4096/api/blocks/getHeight');
      console.log(result.data);
    } catch(err) {
      console.log('error while requesting /blocks/getHeight')
    }
  }, 10 * 1000);

})();
