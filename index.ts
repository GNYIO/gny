import * as assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import initRuntime from './src/runtime';
import initAlt from './src/init';
import { IScope } from './src/interfaces';

function verifyGenesisBlock(scope: Partial<IScope>, block: any) {
  try {
    const payloadHash = crypto.createHash('sha256');

    for (let i = 0; i < block.transactions.length; i++) {
      const trs = block.transactions[i]
      const bytes = scope.base.transaction.getBytes(trs);
      payloadHash.update(bytes)
    }
    const id = scope.base.block.getId(block);
    assert.equal(
      payloadHash.digest().toString('hex'),
      block.payloadHash,
      'Unexpected payloadHash',
    )
    assert.equal(id, block.id, 'Unexpected block id');
  } catch (e) {
    throw e;
  }
}

export default class Application {
  constructor(public options: any) { }

  async run() {
    const options = this.options;
    const pidFile = options.pidFile;

    const scope = await initAlt(options);
    function cb(err, result) {
      if (err) return console.log(err);
      // console.log(result);
    }

    process.once('cleanup', () => {
      scope.logger.info('Cleaning up...');

      try {
        for (let key in scope.modules) {
          if (scope.modules[key].hasOwnProperty('cleanup')) {
            scope.modules[key].cleanup(cb);
          }
        }
        global.app.sdb.close();
        scope.logger.info('Clean up successfully.');
      } catch (e) {
        scope.logger.error(`Error while cleaning up: ${e}`);
      }

      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile)
      }
      process.exit(1)
    })

    process.once('SIGTERM', () => {
      process.emit('cleanup');
    })

    process.once('exit', () => {
      scope.logger.info('process exited')
    })

    process.once('SIGINT', () => {
      process.emit('cleanup')
    })

    process.on('uncaughtException', (err) => {
      // handle the error safely
      scope.logger.fatal('uncaughtException', { message: err.message, stack: err.stack })
      process.emit('cleanup')
    })

    process.on('unhandledRejection', (err) => {
      // handle the error safely
      scope.logger.error('unhandledRejection', err)
      process.emit('cleanup')
    })

    verifyGenesisBlock(scope, scope.genesisBlock.block)

    options.library = scope;

    try {
      await initRuntime(options)
    } catch (e) {
      scope.logger.error('init runtime error: ', e)
      process.exit(1)
      return
    }

    scope.bus.message('bind', scope.modules)

    scope.logger.info('Modules ready and launched')
    if (!scope.config.publicIp) {
      scope.logger.warn('Failed to get public ip, block forging MAY not work!')
    }
  }
}
