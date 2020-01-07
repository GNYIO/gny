import * as fs from 'fs';
import { Api, ApiConfig } from '../lib/api';
import { BlockBase } from '@gny/base';
import { IBlock } from '@gny/interfaces';

let globalOptions: ApiConfig;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
  });
}

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

function getHeight() {
  getApi().get('/api/blocks/getHeight', function(err, result) {
    console.log(err || result.height);
  });
}

function getMilestone() {
  getApi().get('/api/blocks/getMilestone', function(err, result) {
    console.log(err || pretty(result));
  });
}

function getReward() {
  getApi().get('/api/blocks/getReward', function(err, result) {
    console.log(err || pretty(result));
  });
}

function getSupply() {
  getApi().get('/api/blocks/getSupply', function(err, result) {
    console.log(err || pretty(result));
  });
}

function getStatus() {
  getApi().get('/api/blocks/getStatus', function(err, result) {
    console.log(err || pretty(result));
  });
}

function getBlocks(options) {
  const params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
  };
  getApi().get('/api/blocks/', params, function(err, result) {
    console.log(err || pretty(result));
  });
}

function getBlockById(id: string) {
  const params = { id: id };
  getApi().get('/api/blocks/getBlock', params, function(err, result) {
    console.log(err || pretty(result.block));
  });
}

function getBlockByHeight(height: string) {
  const params = { height: height };
  getApi().get('/api/blocks/getBlock', params, function(err, result) {
    console.log(err || pretty(result.block));
  });
}

function getBlockBytes(options) {
  let block;
  try {
    block = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(BlockBase.getBytes(block, true).toString('hex'));
}

function getBlockId(options) {
  let block: IBlock;
  try {
    block = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(BlockBase.getId(block));
}

export default function block(program: ApiConfig) {
  globalOptions = program;

  program
    .command('getheight')
    .description('get latest block height')
    .action(getHeight);

  program
    .command('getstatus')
    .description('get block status')
    .action(getStatus);

  program
    .command('getmilestone')
    .description('get block milestone')
    .action(getMilestone);

  program
    .command('getreward')
    .description('get block reward')
    .action(getReward);

  program
    .command('getsupply')
    .description('get block supply')
    .action(getSupply);

  program
    .command('getblocks')
    .description('get blocks')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option(
      '-s, --sort <field:mode>',
      'height:asc, totalAmount:asc, totalFee:asc'
    )
    .action(getBlocks);

  program
    .command('getblockbyid [id]')
    .description('get block by id')
    .action(getBlockById);

  program
    .command('getblockbyheight [height]')
    .description('get block by height')
    .action(getBlockByHeight);

  program
    .command('getblockbytes')
    .description('get block bytes')
    .option('-f, --file <file>', 'block file')
    .action(getBlockBytes);

  program
    .command('getblockid')
    .description('get block id')
    .option('-f, --file <file>', 'block file')
    .action(getBlockId);
}
