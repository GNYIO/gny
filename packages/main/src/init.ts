import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { Sequence } from '@gny/utils';
import { getSchema } from '@gny/protobuf';
import loadedModules from './loadModules.js';
import loadCoreApi from './loadCoreApi.js';
import { IScope, IConfig } from '@gny/interfaces';
import { IOptions } from './globalInterfaces';
import { isConfig } from '@gny/type-validation';
import { MessageBus } from '@gny/utils';

import { composeNetwork } from './http/index.js';

async function init_alt(options: IOptions) {
  const scope = {} as IScope;
  const genesisBlock = options.genesisBlock;

  if (!isConfig(options.appConfig, options.logger)) {
    throw new Error('Config validation failed');
  }
  const appConfig: IConfig = options.appConfig;

  const protoFile = path.join(process.cwd(), 'proto', 'index.proto');
  if (!fs.existsSync(protoFile)) {
    console.log("Error: Proto file doesn't exist!");
    return;
  }
  scope.protobuf = getSchema(protoFile);

  scope.config = appConfig;
  scope.logger = options.logger;
  scope.tracer = options.tracer;
  scope.genesisBlock = genesisBlock;

  scope.sequence = sequence(options);

  scope.base = {
    bus: scope.bus,
    genesisBlock: scope.genesisBlock,
  };

  global.library = scope;

  scope.modules = loadedModules();
  scope.network = await composeNetwork(
    appConfig,
    scope.modules,
    options.logger
  );
  scope.coreApi = loadCoreApi(scope);

  scope.network.app.use((req, res) => {
    return res
      .status(500)
      .send({ success: false, error: 'API endpoint not found' });
  });

  scope.bus = new MessageBus(scope.modules, scope.coreApi);
  return scope;
}

function sequence(options: any) {
  return new Sequence({
    name: 'normal',
    onWarning: (current: any) => {
      options.logger.warn(`Main sequence ${current}`);
    },
  });
}

export default init_alt;
