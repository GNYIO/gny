import * as shell from 'shelljs';
import * as PeerInfo from 'peer-info';
import * as fs from 'fs';

shell.exec('rm -rf dist/data');
shell.cp('-r', 'proto', 'dist');
shell.cp('genesisBlock.json', 'dist');
shell.cp('config.json', 'dist');
shell.cp('gnyd', 'dist');

shell.mkdir('-p', 'dist/data/blocks');
shell.mkdir('-p', 'dist/logs');

PeerInfo.create((err, peerInfo) => {
  const jsonId = JSON.stringify(peerInfo.id.toJSON());
  fs.writeFile('./dist/p2p_key.json', jsonId, (err) => {
    if (err) { throw err; }
  });
});
