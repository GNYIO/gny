import * as shell from 'shelljs';
import * as PeerInfo from 'peer-info';
import * as fs from 'fs';
import * as path from 'path';

shell.exec('rm -rf dist/data');
shell.cp('-r', 'proto', 'dist');
shell.cp('genesisBlock.json', 'dist');
shell.cp('config.json', 'dist');
shell.cp('gnyd', 'dist');

shell.cp('ormconfig.integration.json', 'dist');
shell.cp('ormconfig.json', 'dist');
shell.cp('ormconfig.sqljs.json', 'dist');
shell.cp('ormconfig.test.json', 'dist');

shell.cp('docker-compose.yml', 'dist');

shell.mkdir('-p', 'dist/data/blocks');
shell.mkdir('-p', 'dist/logs');

shell.mkdir('-p', 'dist/public/dist');
shell.cp('packages/gui-wallet/*', 'dist/public/dist');

PeerInfo.create((err, peerInfo) => {
  const jsonId = JSON.stringify(peerInfo.id.toJSON());
  fs.writeFile('./dist/p2p_key.json', jsonId, err => {
    if (err) {
      throw err;
    }
  });
});

fs.readFile(
  path.join(__dirname, 'ormconfig.json'),
  { encoding: 'utf8' },
  (err, data) => {
    if (err) {
      throw err;
    } else {
      const parsedData: any = JSON.parse(data);
      const postgresPort = parsedData.port;
      const envContent = `POSTGRES_PORT=${postgresPort}`;
      fs.writeFile('dist/.env', envContent, { encoding: 'utf8' }, err => {
        if (err) {
          throw err;
        }
      });
    }
  }
);
