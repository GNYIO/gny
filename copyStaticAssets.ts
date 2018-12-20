import * as shell from 'shelljs';

shell.exec('rm -rf dist/data/');
shell.cp('-r', 'proto', 'dist');
shell.cp('genesisBlock.json', 'dist');
shell.cp('config.json', 'dist');

shell.mkdir('-p', 'dist/data/blocks');
