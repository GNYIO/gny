import { SmartDB } from '@gny/database-postgres';
import BalanceManager from './smartdb/balance-manager.js';
import loadContracts from './loadContracts.js';

import BigNumber from 'bignumber.js';
import { IOptions, IValidatorConstraints } from './globalInterfaces.js';
import { StateHelper } from './core/StateHelper.js';
import * as prom from 'prom-client';
import { Account, Block, Transaction } from '@gny/database-postgres';
import Peer from './core/peer.js';
import { Mutex } from 'async-mutex';

export default async function runtime(options: IOptions) {
  global.state = StateHelper.getInitialState();
  StateHelper.SetForgingEnabled(true);
  StateHelper.InitializeTransactionPool();
  StateHelper.InitializeFailedTrsCache();
  StateHelper.InitializeModulesAreLoaded();
  StateHelper.InitializeBlockchainReady();
  StateHelper.InitializeLatestBlockCache();
  StateHelper.SetIsSyncing(false);

  global.app = {
    sdb: null,
    balances: null,
    contract: {},
    contractTypeMapping: {},
    logger: options.logger,
    tracer: options.tracer,
    mutex: new Mutex(),
  };
  global.app.prom = {
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
        const data = await global.app.sdb.count<Block>(Block, {});
        this.set(Number.parseInt(data));
      },
    }),
    transactions: new prom.Gauge<string>({
      name: 'gny_transactions',
      help: 'the number of blocks',
      collect: async function getTransactions() {
        const data = await global.app.sdb.count<Transaction>(Transaction, {});
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
        const data = Peer.p2p.getAllConnectedPeersPeerInfo();
        this.set(data.length);
      },
    }),
    requests: new prom.Counter<string>({
      name: 'gny_requests',
      help: 'a counter for requests counter',
      labelNames: ['method', 'endpoint', 'statusCode'],
    }),
  };
  global.app.validators = {
    amount: amount => {
      if (typeof amount !== 'string') return 'Invalid amount type';
      if (!/^[1-9][0-9]*$/.test(amount))
        return 'Amount should be positive integer';

      let bnAmount;
      try {
        bnAmount = new BigNumber(amount);
      } catch (e) {
        return 'Failed to convert';
      }
      if (bnAmount.lt(1) || bnAmount.gt('9000000000000000000'))
        return 'Invalid amount range';
      return null;
    },
    name: value => {
      const regname = /^[a-z0-9_]{2,20}$/;
      if (!regname.test(value)) return 'Invalid name';
      return null;
    },
    publickey: value => {
      const reghex = /^[0-9a-fA-F]{64}$/;
      if (!reghex.test(value)) return 'Invalid public key';
      return null;
    },
    description: value => {
      const msg = 'Invalid description';
      if (value == null || value == undefined) return msg;
      if (typeof value !== 'string') return msg;
      const regex = /^([A-Za-z]+ )+[A-Za-z]+$|^[A-Za-z]+$/;
      if (!regex.test(value)) return msg;
      return null;
    },
  };
  global.app.validate = (
    type: string,
    value: any,
    constraints: IValidatorConstraints
  ) => {
    if (!global.app.validators[type])
      throw new Error(`Validator not found: ${type}`);
    const error = global.app.validators[type](value, constraints);
    if (error) throw new Error(error);
  };
  global.app.getContractName = type => global.app.contractTypeMapping[type];

  global.app.sdb = new SmartDB(options.logger, {
    dbPassword: options.appConfig.dbPassword,
    dbDatabase: options.appConfig.dbDatabase,
    dbUser: options.appConfig.dbUser,
    dbHost: options.appConfig.dbHost,
    dbPort: options.appConfig.dbPort,

    cachedBlockCount: 10,
  });
  await global.app.sdb.init();
  global.app.balances = new BalanceManager(global.app.sdb);

  await loadContracts();

  global.app.contractTypeMapping[0] = 'basic.transfer';
  global.app.contractTypeMapping[1] = 'basic.setUserName';
  global.app.contractTypeMapping[2] = 'basic.setSecondPassphrase';
  global.app.contractTypeMapping[3] = 'basic.lock';
  global.app.contractTypeMapping[4] = 'basic.vote';
  global.app.contractTypeMapping[5] = 'basic.unvote';
  global.app.contractTypeMapping[6] = 'basic.unlock';
  global.app.contractTypeMapping[10] = 'basic.registerDelegate';
  global.app.contractTypeMapping[20] = 'basic.burn';

  global.app.contractTypeMapping[100] = 'uia.registerIssuer';
  global.app.contractTypeMapping[101] = 'uia.registerAsset';
  global.app.contractTypeMapping[102] = 'uia.issue';
  global.app.contractTypeMapping[103] = 'uia.transfer';

  global.app.contractTypeMapping[201] = 'ml.uploadData';
  global.app.contractTypeMapping[202] = 'ml.getPrediction';
  global.app.contractTypeMapping[203] = 'ml.getPredictionCategory';
  global.app.contractTypeMapping[204] = 'ml.getPredictionTime';
  global.app.contractTypeMapping[205] = 'ml.getPredictionLocation';
  global.app.contractTypeMapping[206] = 'ml.filterOutliers';
  global.app.contractTypeMapping[207] = 'ml.fraudDetection';
  global.app.contractTypeMapping[208] = 'ml.locationPrediction';
  global.app.contractTypeMapping[209] = 'ml.nlp';

  global.app.contractTypeMapping[300] = 'nft.registerNftMaker';
  global.app.contractTypeMapping[301] = 'nft.createNft';
}
