import * as shell from 'shelljs';
import * as PeerId from 'peer-id';
import * as fs from 'fs';
import * as path from 'path';

const pathToP2PKey = path.join(__dirname, 'dist', 'p2pKey.json');
let content;
if (fs.existsSync(pathToP2PKey)) {
  content = fs.readFileSync(pathToP2PKey, { encoding: 'utf8' });
}

shell.exec('rm -rf dist/data/');
shell.cp('-r', 'proto', 'dist');
shell.cp('genesisBlock.json', 'dist');
shell.cp('config.json', 'dist');

shell.mkdir('-p', 'dist/data/blocks');
shell.mkdir('-p', 'dist/logs');

if (!content) {
  PeerId.create({}, (err, id) => {
    if (err) { throw err; }
    const jsonId = JSON.stringify(id.toJSON(), null, 2);
    fs.writeFile('./dist/p2pKey.json', jsonId, (err) => {
      if (err) { throw err; }
    });
  });
}