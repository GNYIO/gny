import * as shell from 'shelljs';
import * as PeerId from 'peer-id';
import * as fs from 'fs';

shell.exec('rm -rf dist/data');
shell.cp('-r', 'proto', 'dist');
shell.cp('genesisBlock.json', 'dist');
shell.cp('config.json', 'dist');
shell.cp('gnyd', 'dist');
shell.cp('ormconfig.json', 'dist');
shell.cp('docker-compose.yml', 'dist');

shell.mkdir('-p', 'dist/data/blocks');
shell.mkdir('-p', 'dist/logs');

PeerId.create({}, (err, id) => {
  if (err) { throw err; }
  const jsonId = JSON.stringify(id.toJSON(), null, 2);
  fs.writeFile('./dist/p2p_key.json', jsonId, (err) => {
    if (err) { throw err; }
  });
});
