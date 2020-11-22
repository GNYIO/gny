import * as _ from 'lodash';
import { SmartDB } from '@gny/database-postgres';
import BalanceManager from './smartdb/balance-manager';
import loadContracts from './loadContracts';

import { BigNumber } from 'bignumber.js';
import { IOptions, IValidatorConstraints } from './globalInterfaces';
import { StateHelper } from './core/StateHelper';

export default async function runtime(options: IOptions) {
  global.state = StateHelper.getInitialState();
  StateHelper.SetForgingEnabled(true);
  StateHelper.InitializeTransactionPool();
  StateHelper.InitializeFailedTrsCache();
  StateHelper.InitializeModulesAreLoaded();
  StateHelper.InitializeBlockchainReady();
  StateHelper.InitializeLatestBlockCache();
  StateHelper.InitializeBlockHeaderMidCache();

  global.app = {
    sdb: null,
    balances: null,
    contract: {},
    contractTypeMapping: {},
    logger: options.logger,
    tracer: options.tracer,
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
}
