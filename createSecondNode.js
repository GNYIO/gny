const shell = require('shelljs');
const PeerId = require('peer-id');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const crypto = require('crypto');
const { promisify } = require('util');

const createPeerIdAsync = promisify(PeerId.create);

(async () => {

  if (!fs.existsSync('./dist')) {
    console.error('first run: "npm run tsc"');
    process.exit(1);
  }


  const HOW_MANY_NODES = Number(process.argv[2]) || 2;
  if (Number.isNaN(HOW_MANY_NODES) || HOW_MANY_NODES > 101) {
    console.error('please provide a number smaller then or equal to 101');
    process.exit(1);
  }
  if (HOW_MANY_NODES <= 1) {
    console.log('number must be greater then 1');
    process.exit(1);
  }


  // fillter all dist directories except "dist"
  const distDirectories = fs.readdirSync(__dirname)
    .filter((item) => RegExp('dist[1-9]+').test(item));

  distDirectories.forEach((dir) => {
    shell.exec(`rm -rf ${dir}`);
  });

  // copy dist directories
  for (let i = 1; i < HOW_MANY_NODES; ++i) {
    shell.exec(`cp -r ./dist ./dist${i}`);
  }

  // read dist/ data
  let firstConfig = fs.readFileSync('./config.json', { encoding: 'utf8' });
  firstConfig = JSON.parse(firstConfig);
  let firstKey = fs.readFileSync('./dist/p2p_key.json', { encoding: 'utf8' });
  firstKey = JSON.parse(firstKey);



  for (let i = 1; i < HOW_MANY_NODES; ++i) {
    const id = await createPeerIdAsync();

    shell.exec(`rm ./dist${i}/p2p_key.json`);
    fs.writeFileSync(`./dist${i}/p2p_key.json`, JSON.stringify(id, null, 2), { encoding: 'utf8' });
  }



  const MULTIADDRS_FIRST = `/ip4/${firstConfig.address}/tcp/${firstConfig.peerPort}/ipfs/${firstKey.id}`;

  const INTIAL_SECRETS = firstConfig.forging.secret;
  const count = INTIAL_SECRETS.length;
  const onePart = Math.floor(count / HOW_MANY_NODES);

  for (let i = 0; i < HOW_MANY_NODES; ++i) {

    const nthConfig = _.cloneDeep(firstConfig);
    nthConfig.port += (i * 2);
    nthConfig.peerPort += (i * 2);

    const from = i * onePart;
    let to = (i + 1) * onePart;

    // mind the rest of the division (affects only last node)
    if ((i + 1) === HOW_MANY_NODES) {
      to = undefined;
    }

    const partitionedSecrets = INTIAL_SECRETS.slice(from, to);
    nthConfig.forging.secret = partitionedSecrets;


    if (i === 0) {
      nthConfig.peers.bootstrap = null;

      shell.exec('rm ./dist/config.json');
      fs.writeFileSync('./dist/config.json', JSON.stringify(nthConfig, null, 2), { encoding: 'utf8' });
    } else {
      nthConfig.peers.bootstrap = MULTIADDRS_FIRST;

      shell.exec(`rm ./dist${i}/config.json`);
      fs.writeFileSync(`./dist${i}/config.json`, JSON.stringify(nthConfig, null, 2), { encoding: 'utf8' });
    }
  }


  process.exit(1);

})();