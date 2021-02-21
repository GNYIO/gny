import * as shell from 'shelljs';
import * as fs from 'fs-extra';
import * as path from 'path';

if (process.argv.length <= 2) {
  throw new Error('please pass a directory as argument');
}

const destinationPath = String(process.argv[2]);
if (!fs.lstatSync(destinationPath).isDirectory()) {
  throw new Error('provided argument is not a directory');
}

shell.cp('config.json', destinationPath);

const logDirectory = path.join(destinationPath, 'logs');
shell.mkdir('-p', logDirectory);
