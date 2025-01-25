import initRuntime from './runtime.js';
import initAlt from './init.js';
import { IScope, IConfig, ILogger, IBlock, ITracer } from '@gnyio/interfaces';
import * as StateHelper from './core/StateHelper.js';
import { verifyGenesisBlock } from './verifyGenesisBlock.js';
import { container, TYPES } from '@gnyio/container';

export interface LocalOptions {
  appConfig: IConfig;
  genesisBlock: IBlock;
  logger: ILogger;
  library?: Partial<IScope>;
}

export default class Application {
  private options: LocalOptions;
  constructor(options: LocalOptions) {
    this.options = options;
  }

  async run() {
    const options = this.options;

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
        scope.logger.error('Error while cleaning up:');
        scope.logger.error(e);
      }

      process.exit(1);
    });

    process.once('SIGTERM', () => {
      const tracerService = container.get<ITracer>(TYPES.TracerService);

      tracerService.startSpan('sigterm').finish();
      process.emit('cleanup');

      // important
      tracerService.close();
    });

    process.once('exit', () => {
      const tracerService = container.get<ITracer>(TYPES.TracerService);

      tracerService.startSpan('exit').finish();
      scope.logger.info('process exited');
    });

    process.once('SIGINT', () => {
      const tracerService = container.get<ITracer>(TYPES.TracerService);

      tracerService.startSpan('sigint').finish();
      process.emit('cleanup');

      // important
      tracerService.close();
    });

    process.on('uncaughtException', (err: Error) => {
      const tracerService = container.get<ITracer>(TYPES.TracerService);

      const span = tracerService.startSpan('uncaughtException');
      span.setTag('error', true);
      span.log({
        value: `uncaughtException ${err}`,
        stack: err.stack,
      });
      span.finish();

      // handle the error safely
      scope.logger.fatal('uncaughtException');
      scope.logger.fatal(err);
      process.emit('cleanup');

      // important
      tracerService.close();
    });

    process.on('unhandledRejection', (err: Error) => {
      const tracerService = container.get<ITracer>(TYPES.TracerService);

      const span = tracerService.startSpan('unhandledRejection');
      span.setTag('error', true);
      span.log({
        value: `unhandledRejection ${err}`,
        stack: err.stack,
      });
      span.finish();

      // handle the error safely
      scope.logger.error('unhandledRejection');
      scope.logger.error(err);
      scope.logger.error(err.stack);
      process.emit('cleanup');

      // important
      tracerService.close();
    });

    verifyGenesisBlock(scope.genesisBlock);

    options.library = scope;

    try {
      await initRuntime(options);
    } catch (e) {
      const tracerService = container.get<ITracer>(TYPES.TracerService);

      const span = tracerService.startSpan('init runtime error');
      span.setTag('error', true);
      span.log({
        value: `init runtime error ${e}`,
      });
      span.finish();

      scope.logger.error('init runtime error');
      scope.logger.error(e);
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
