const shell = require('shelljs');
const PeerId = require('peer-id');
const fs = require('fs');
const _ = require('lodash');


if (!fs.existsSync('./dist')) {
  throw new Error('first run: "npm run tsc"');
}

shell.exec('rm -rf dist2');

shell.exec('cp -r ./dist ./dist2');

let firstConfig = fs.readFileSync('./dist/config.json', { encoding: 'utf8' });
firstConfig = JSON.parse(firstConfig);

let firstKey = fs.readFileSync('./dist/p2p_key.json', { encoding: 'utf8' });
firstKey = JSON.parse(firstKey);


// create secondKey and save it immediately
PeerId.create({}, (err, secondKey) => {
  secondKey = secondKey.toJSON();

  shell.exec('rm ./dist2/p2p_key.json');
  fs.writeFileSync('./dist2/p2p_key.json', JSON.stringify(secondKey, null, 2), { encoding: 'utf8' });


  const secondConfig = _.cloneDeep(firstConfig);

  // change
  secondConfig.port = firstConfig.port + 2;
  secondConfig.peerPort = firstConfig.peerPort + 2;


  const wayToCallFirstAddress = `/ip4/${firstConfig.address}/tcp/${firstConfig.peerPort}/ipfs/${firstKey.id}`;
  const wayToCallSecondAddress = `/ip4/${secondConfig.address}/tcp/${secondConfig.peerPort}/ipfs/${secondKey.id}`;


  const DIVIDE_BY = 2;
  const count = firstConfig.forging.secret.length;
  const onePart = Math.floor(count / DIVIDE_BY);
  const rest = count % DIVIDE_BY;

  const firstSecrets = firstConfig.forging.secret.slice(0, onePart);
  const secondSecrets = firstConfig.forging.secret.slice(onePart);


  firstConfig.peers.bootstrap = wayToCallSecondAddress;
  secondConfig.peers.bootstrap = wayToCallFirstAddress;

  firstConfig.forging.secret = firstSecrets;
  secondConfig.forging.secret = secondSecrets;


  fs.writeFileSync('./dist/config.json', JSON.stringify(firstConfig, null, 2), { encoding: 'utf8' });
  fs.writeFileSync('./dist2/config.json', JSON.stringify(secondConfig, null, 2), { encoding: 'utf8' });


});