import * as fs from 'fs';
import initRuntime from './src/runtime';
import initAlt from './src/init';
import { IScope, IConfig, ILogger, IGenesisBlock } from './src/interfaces';
import { StateHelper } from './src/core/StateHelper';
import { verifyGenesisBlock } from './src/utils/verifyGenesisBlock';

interface LocalOptions {
  appConfig: IConfig;
  genesisBlock: IGenesisBlock;
  logger: ILogger;
  pidFile: string;
  library?: Partial<IScope>;
}

export default class Application {
  private options: LocalOptions;
  constructor(options: LocalOptions) {
    this.options = options;
  }

  async run() {
    const options = this.options;
    const pidFile = options.pidFile;

    const scope = await initAlt(options);
    function cb(err, result) {
      if (err) return console.log(err);
      // console.log(result);
    }

    process.once('cleanup', async () => {
      scope.logger.info('Cleaning up...');

      StateHelper.SetAllModulesLoaded(false);

      try {
        for (const key in scope.modules) {
          if (scope.modules[key].hasOwnProperty('cleanup')) {
            scope.modules[key].cleanup(cb);
          }
        }
        await global.app.sdb.close();
        scope.logger.info('Clean up successfully.');
      } catch (e) {
        scope.logger.error(`Error while cleaning up: ${e}`);
      }

      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
      process.exit(1);
    });

    process.once('SIGTERM', () => {
      process.emit('cleanup');
    });

    process.once('exit', () => {
      scope.logger.info('process exited');
    });

    process.once('SIGINT', () => {
      process.emit('cleanup');
    });

    process.on('uncaughtException', err => {
      // handle the error safely
      scope.logger.fatal('uncaughtException', {
        message: err.message,
        stack: err.stack,
      });
      process.emit('cleanup');
    });

    process.on('unhandledRejection', err => {
      // handle the error safely
      scope.logger.error('unhandledRejection', err);
      process.emit('cleanup');
    });

    verifyGenesisBlock(scope.genesisBlock);

    options.library = scope;

    try {
      await initRuntime(options);
    } catch (e) {
      scope.logger.error('init runtime error: ', e);
      process.exit(1);
      return;
    }

    StateHelper.SetAllModulesLoaded(true);
    scope.bus.message('onBind', scope.modules);

    scope.logger.info('Modules ready and launched');
    if (!scope.config.publicIp) {
      scope.logger.warn('Failed to get public ip, block forging MAY not work!');
    }
  }
}
