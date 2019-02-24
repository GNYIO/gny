import * as shell from 'shelljs';
import * as PeerId from 'peer-id';
import * as fs from 'fs';
import * as path from 'path';

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

fs.readFile(path.join(__dirname, 'ormconfig.json'), { encoding: 'utf8' }, (err, data) => {
  if (err) { throw err; }
  else {
    const parsedData: any = JSON.parse(data);
    const postgresPort = parsedData.port;
    const redisPort = parsedData.cache.options.port;
    const envContent = `POSTGRES_PORT=${postgresPort}\nREDIS_PORT=${redisPort}`;
    fs.writeFile('dist/.env', envContent, { encoding: 'utf8' }, (err) => {
      if (err) { throw err; }
    });
  }
});
