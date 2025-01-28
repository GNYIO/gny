import * as fs from 'fs';
import * as path from 'path';
import { Sequence } from '@gnyio/utils';
import { getSchema } from '@gnyio/protobuf';
import loadedModules from './loadModules.js';
import loadCoreApi from './loadCoreApi.js';
import { IScope, IConfig, ILogger, ITracer } from '@gnyio/interfaces';
import { IOptions, IProm } from './globalInterfaces';
import { isConfig } from '@gnyio/type-validation';
import { MessageBus } from '@gnyio/utils';
import { composeNetwork } from './http/index.js';
import { container, TYPES } from '@gnyio/container';
import { ContainerModule, interfaces } from 'inversify';
import { Mutex } from 'async-mutex';
import {
  IP2PService,
  Bundle,
  P2POptions,
  attachEventHandlers,
} from '@gnyio/p2p';
import * as PeerId from 'peer-id';
import * as tracerpkg from '@gnyio/tracer';
import * as prom from 'prom-client';
import * as StateHelper from './core/StateHelper.js';
import { Account, Transaction } from '@gnyio/database-postgres';

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
    bind<IP2PService>(TYPES.P2PService)
      .toDynamicValue((context: interfaces.Context) => {
        const p2pOptions: P2POptions = {
          peerId,
          announceIp: global.library.config.publicIp,
          port: global.library.config.peerPort,
          logger: global.library.logger,
          config: global.Config.p2pConfig,
        };

        const tracer = context.container.get<ITracer>(TYPES.TracerService);

        const wrapper = new Bundle(p2pOptions, tracer);
        attachEventHandlers(wrapper, p2pOptions.announceIp);

        return wrapper;
      })
      .inSingletonScope();
  });

  return p2pServiceModule;
}

function createPrometheus() {
  // IProm
  const prometheusService = new ContainerModule((bind: interfaces.Bind) => {
    bind<IProm>(TYPES.PrometheusService)
      .toDynamicValue((context: interfaces.Context) => {
        const prometheus: IProm = {
          accounts: new prom.Gauge<string>({
            name: 'gny_accounts',
            help: 'the number of accounts',
            collect: async function getAccounts() {
              const data = await global.app.sdb.count<Account>(Account, {});
              this.set(Number.parseInt(data));
            },
          }),
          blocks: new prom.Gauge<string>({
            name: 'gny_blocks',
            help: 'the number of blocks',
            collect: async function getBlocks() {
              const lastBlock = StateHelper.getState().lastBlock;
              // +1, because height 0 is also a block
              this.set(Number.parseInt(lastBlock.height) + 1);
            },
          }),
          transactions: new prom.Gauge<string>({
            name: 'gny_transactions',
            help: 'the number of transactions',
            collect: async function getTransactions() {
              const data = await global.app.sdb.count<Transaction>(
                Transaction,
                {}
              );
              this.set(Number.parseInt(data));
            },
          }),
          syncing: new prom.Gauge<string>({
            name: 'gny_syncing',
            help: 'if we are syncing or not, yes if 1, if not then 0',
            collect: function getSyncingStatus() {
              const isSyncing = StateHelper.IsSyncing();
              const data = isSyncing === true ? 1 : 0;
              this.set(data);
            },
          }),
          peers: new prom.Gauge<string>({
            name: 'gny_peers_connected',
            help: 'number of peers we are connected to',
            collect: function getPeers() {
              const p2pService = container.get<IP2PService>(TYPES.P2PService);

              const data = p2pService.getAllConnectedPeersPeerInfo();
              this.set(data.length);
            },
          }),
          requests: new prom.Counter<string>({
            name: 'gny_requests',
            help: 'a counter for requests counter',
            labelNames: ['method', 'endpoint', 'statusCode'],
          }),
        };

        return prometheus;
      })
      .inSingletonScope();
  });

  return prometheusService;
}

function createInversifyTracer(appConfig: IConfig, logger: ILogger) {
  const tracerServiceModule = new ContainerModule((bind: interfaces.Bind) => {
    // it's important that  we use the single scope

    // tracer
    bind<ITracer>(TYPES.TracerService)
      .toDynamicValue((context: interfaces.Context) => {
        const tracer = tracerpkg.initTracer(
          appConfig.publicIp,
          appConfig.jaegerHost,
          appConfig.version,
          appConfig.magic,
          appConfig.netVersion,
          appConfig.p2pConfig.P2P_VERSION,
          logger
        );
        return tracer;
      })
      .inSingletonScope();
  });

  return tracerServiceModule;
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
  const tracerServiceModule = createInversifyTracer(
    options.appConfig,
    options.logger
  );
  const prometheusServiceModule = createPrometheus();
  container.load(tracerServiceModule);
  container.load(mutexServiceModule);
  container.load(p2pServiceModule);
  container.load(prometheusServiceModule);

  // initialize p2pService in an async way
  const p2pService = container.get<IP2PService>(TYPES.P2PService);
  await scope.modules.peer.initializeLibP2P(p2pService);

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
