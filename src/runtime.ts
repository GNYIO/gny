// import * as path from 'path';
import { EventEmitter } from 'events';
import * as _ from 'lodash';
import validate = require('validate.js');
import { SmartDB } from '../packages/database-postgres/smartdb';
// import { Logger } from '../packages/database-postgres/logger';
// import slots from './utils/slots';
import BalanceManager from './smartdb/balance-manager';
import AutoIncrement from  './smartdb/auto-increment';
// import loadModels from './loadModels';
import loadContracts from './loadContracts';

import address from './utils/address';
import * as bignumber from 'bignumber';

export default async function runtime(options) {
  global.app = {
    sdb: null,
    balances: null,
    contract: {},
    contractTypeMapping: {},
    feeMapping: {},
    defaultFee: {
      currency: 'GNY',
      min: '10000000',
    },
    hooks: {},
    logger: options.logger,
  };
  global.app.validators = {
    amount: (amount) => {
      if (typeof amount !== 'string') return 'Invalid amount type';
      if (!/^[1-9][0-9]*$/.test(amount)) return 'Amount should be integer';

      let bnAmount;
      try {
        bnAmount = global.app.util.bignumber(amount);
      } catch (e) {
        return 'Failed to convert';
      }
      if (bnAmount.lt(1) || bnAmount.gt('1e48')) return 'Invalid amount range';
      return null;
    },
    name: (value) => {
      const regname = /^[a-z0-9_]{2,20}$/;
      if (!regname.test(value)) return 'Invalid name';
      return null;
    },
    publickey: (value) => {
      const reghex = /^[0-9a-fA-F]{64}$/;
      if (!reghex.test(value)) return 'Invalid public key';
      return null;
    },
    string: (value, constraints) => {
      if (constraints.length) {
        return JSON.stringify(validate({ data: value }, { data: { length: constraints.length } }));
      } if (constraints.isEmail) {
        return JSON.stringify(validate({ email: value }, { email: { email: true } }));
      } if (constraints.url) {
        return JSON.stringify(validate({ url: value }, { url: { url: constraints.url } }));
      } if (constraints.number) {
        return JSON.stringify(validate(
          { number: value },
          { number: { numericality: constraints.number } },
        ));
      }
      return null;
    },
  };
  global.app.validate = (type, value, constraints) => {
    if (!global.app.validators[type]) throw new Error(`Validator not found: ${type}`);
    const error = global.app.validators[type](value, constraints);
    if (error) throw new Error(error);
  };
  global.app.registerContract = (type, name) => {
    // if (type < 1000) throw new Error('Contract types that small than 1000 are reserved')
    global.app.contractTypeMapping[type] = name;
  };
  global.app.getContractName = type => global.app.contractTypeMapping[type];

  global.app.registerFee = (type, min, currency) => {
    global.app.feeMapping[type] = {
      currency: currency || global.app.defaultFee.currency,
      min,
    };
  };
  global.app.getFee = type => global.app.feeMapping[type];

  global.app.setDefaultFee = (min, currency) => {
    global.app.defaultFee.currency = currency;
    global.app.defaultFee.min = min;
  };

  global.app.addRoundFee = (fee, roundNumber) => {
    options.modules.blocks.increaseRoundData({ fees: fee }, roundNumber);
  };

  global.app.registerHook = (name, func) => {
    global.app.hooks[name] = func;
  };

  global.app.sdb = new SmartDB();
  await global.app.sdb.init();
  global.app.balances = new BalanceManager(global.app.sdb);
  global.app.autoID = new AutoIncrement(global.app.sdb);
  global.app.events = new EventEmitter();

  global.app.util = {
    address: address,
    bignumber: bignumber,
  };



  // await loadModels();
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
}
