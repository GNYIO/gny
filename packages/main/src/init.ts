import * as fs from 'fs';
import * as path from 'path';
import { Sequence } from '@gnyio/utils';
import { getSchema } from '@gnyio/protobuf';
import loadedModules from './loadModules.js';
import loadCoreApi from './loadCoreApi.js';
import { IScope, IConfig } from '@gnyio/interfaces';
import { IOptions } from './globalInterfaces';
import { isConfig } from '@gnyio/type-validation';
import { MessageBus } from '@gnyio/utils';
import { composeNetwork } from './http/index.js';
import { container, TYPES } from '@gnyio/container';
import { ContainerModule, interfaces } from 'inversify';
import { Mutex } from 'async-mutex';
import { IP2PService, create } from '@gnyio/p2p';
import * as PeerId from 'peer-id';

export const mutexServiceModule = new ContainerModule(
  (bind: interfaces.Bind) => {
    // it's important that  we use the single scope
    bind<Mutex>(TYPES.MutexService)
      .to(Mutex)
      .inSingletonScope();
  }
);

async function preparePeerId() {
  const buf = Buffer.from(global.library.config.peers.privateP2PKey, 'base64');
  const peerId = await PeerId.createFromPrivKey(buf);

  return peerId;
}

async function createInversifyP2PService() {
  const bootstrapNode = global.library.config.peers.bootstrap
    ? global.library.config.peers.bootstrap
    : [];
  const peerId = await preparePeerId();

  const p2pServiceModule = new ContainerModule((bind: interfaces.Bind) => {
    // it's important that  we use the single scope

    const p2pService: IP2PService = create(
      peerId,
      global.library.config.publicIp,
      global.library.config.peerPort,
      bootstrapNode,
      global.library.logger,
      global.Config.p2pConfig
    );
    bind<IP2PService>(TYPES.P2PService).toConstantValue(p2pService);
  });

  return p2pServiceModule;
}

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

  // register module
  const p2pServiceModule = await createInversifyP2PService();
  container.load(mutexServiceModule, p2pServiceModule /* other modules */);

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
