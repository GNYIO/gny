import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import * as ip from 'ip';
import * as _ from 'lodash';
import Sequence from './utils/sequence';
import { getSchema } from './utils/protobuf';
import loadedModules from './loadModules';
import loadCoreApi from './loadCoreApi';
import extendedJoi from './utils/extendedJoi';
import { IScope, IMessageEmitter, IConfig, IOptions } from './interfaces';
import { isConfig } from '../packages/type-validation';

import initNetwork from '../packages/http/index';

function getPublicIp() {
  let publicIp;
  try {
    const ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(ifname => {
      ifaces[ifname].forEach(iface => {
        if (iface.family !== 'IPv4' || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return;
        }
        if (!ip.isPrivate(iface.address)) {
          publicIp = iface.address;
        }
      });
    });
  } catch (e) {
    throw e;
  }
  return publicIp;
}

async function init_alt(options: IOptions) {
  const scope = {} as IScope;
  const genesisBlock = options.genesisBlock;

  if (!isConfig(options.appConfig, options.logger)) {
    throw new Error('Config validation failed');
  }
  const appConfig: IConfig = options.appConfig;

  if (!appConfig.publicIp) {
    appConfig.publicIp = getPublicIp();
  }

  const protoFile = path.join(__dirname, '..', 'proto', 'index.proto');
  if (!fs.existsSync(protoFile)) {
    console.log("Error: Proto file doesn't exist!");
    return;
  }
  scope.protobuf = getSchema(protoFile);

  scope.config = appConfig;
  scope.logger = options.logger;
  scope.genesisBlock = genesisBlock;

  scope.joi = extendedJoi;
  scope.network = await initNetwork(appConfig, scope.modules, options.logger);
  scope.sequence = sequence(options);

  scope.base = {
    bus: scope.bus,
    genesisBlock: scope.genesisBlock,
  };

  global.library = scope;

  scope.modules = loadedModules(scope);
  scope.coreApi = loadCoreApi(scope.modules, scope);

  scope.network.app.use((req, res) => {
    return res
      .status(500)
      .send({ success: false, error: 'API endpoint not found' });
  });

  class Bus extends EventEmitter implements IMessageEmitter {
    message(topic: string, ...restArgs) {
      Object.keys(scope.modules).forEach(moduleName => {
        const module = scope.modules[moduleName];
        if (typeof module[topic] === 'function') {
          module[topic].apply(module[topic], [...restArgs]);
        }
      });

      Object.keys(scope.coreApi).forEach(apiName => {
        const oneApi = scope.coreApi[apiName];
        if (typeof oneApi[topic] === 'function') {
          oneApi[topic].apply(oneApi[topic], [...restArgs]);
        }
      });
      this.emit(topic, ...restArgs);
    }
  }
  scope.bus = new Bus();
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
