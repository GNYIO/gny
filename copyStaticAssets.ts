import * as shell from 'shelljs';
import * as PeerInfo from 'peer-info';
import * as fs from 'fs-extra';
import * as path from 'path';

if (process.argv.length <= 2) {
  throw new Error('please pass a directory as argument');
}

const destinationPath = String(process.argv[2]);
if (!fs.lstatSync(destinationPath).isDirectory()) {
  throw new Error('provided argument is not a directory');
}

shell.cp('genesisBlock.json', destinationPath);
shell.cp('config.json', destinationPath);

shell.cp('ormconfig*', destinationPath);

shell.cp('docker-compose.yml', destinationPath);

const logDirectory = path.join(destinationPath, 'logs');
shell.mkdir('-p', logDirectory);

PeerInfo.create((err, peerInfo) => {
  const jsonId = JSON.stringify(peerInfo.id.toJSON());
  const p2pKeyFilePath = path.join(destinationPath, 'p2p_key.json');
  fs.writeFile(p2pKeyFilePath, jsonId, err => {
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
      const parsedData: any = JSON.parse(data.toString());
      const postgresPort = parsedData.port;
      const envContent = `POSTGRES_PORT=${postgresPort}`;
      const envFilePath = path.join(destinationPath, '.env');
      fs.writeFile(envFilePath, envContent, { encoding: 'utf8' }, err => {
        if (err) {
          throw err;
        }
      });
    }
  }
);
