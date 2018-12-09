import fs = require('fs');
import path = require('path');
import util = require('util');
import { EventEmitter } from 'events';
import * as _ from 'lodash';
import validate = require('validate.js');
import { AschCore } from 'asch-smartdb';
import Slots from './utils/slots'
import Router = require('./utils/router');
import BalanceManager from './smartdb/balance-manager';
import AutoIncrement from  './smartdb/auto-increment';
import transactionMode from './utils/transaction-mode';
import loadModels from './loadModels'
import loadContracts from './loadContracts'
import loadInterfaces from './loadInterfaces'

import address from './utils/address';
import * as bignumber from 'bignumber'

const PIFY = util.promisify
const slots = new Slots()

function adaptSmartDBLogger(config) {
  const { LogLevel } = AschCore
  const levelMap = {
    trace: LogLevel.Trace,
    debug: LogLevel.Debug,
    log: LogLevel.Log,
    info: LogLevel.Info,
    warn: LogLevel.Warn,
    error: LogLevel.Error,
    fatal: LogLevel.Fatal,
  }

  AschCore.LogManager.logFactory = {
    createLog: () => app.logger,
    format: false,
    getLevel: () => {
      const appLogLevel = String(config.logLevel).toLocaleLowerCase()
      return levelMap[appLogLevel] || LogLevel.Info
    },
  }
}

export default async function runtime(options) {
  global.app = {
    sdb: null,
    balances: null,
    model: {},
    contract: {},
    contractTypeMapping: {},
    feeMapping: {},
    defaultFee: {
      currency: 'AEC',
      min: '10000000',
    },
    hooks: {},
    custom: {},
    logger: options.logger,
  };
  global.app.validators = {
    amount: (amount) => {
      if (typeof amount !== 'string') return 'Invalid amount type'
      if (!/^[1-9][0-9]*$/.test(amount)) return 'Amount should be integer'
  
      let bnAmount
      try {
        bnAmount = global.app.util.bignumber(amount)
      } catch (e) {
        return 'Failed to convert'
      }
      if (bnAmount.lt(1) || bnAmount.gt('1e48')) return 'Invalid amount range'
      return null
    },
    name: (value) => {
      const regname = /^[a-z0-9_]{2,20}$/
      if (!regname.test(value)) return 'Invalid name'
      return null
    },
    publickey: (value) => {
      const reghex = /^[0-9a-fA-F]{64}$/
      if (!reghex.test(value)) return 'Invalid public key'
      return null
    },
    string: (value, constraints) => {
      if (constraints.length) {
        return JSON.stringify(validate({ data: value }, { data: { length: constraints.length } }))
      } if (constraints.isEmail) {
        return JSON.stringify(validate({ email: value }, { email: { email: true } }))
      } if (constraints.url) {
        return JSON.stringify(validate({ url: value }, { url: { url: constraints.url } }))
      } if (constraints.number) {
        return JSON.stringify(validate(
          { number: value },
          { number: { numericality: constraints.number } },
        ))
      }
      return null
    },
  }
  global.app.validate = (type, value, constraints) => {
    if (!global.app.validators[type]) throw new Error(`Validator not found: ${type}`)
    const error = global.app.validators[type](value, constraints)
    if (error) throw new Error(error)
  }
  global.app.registerContract = (type, name) => {
    // if (type < 1000) throw new Error('Contract types that small than 1000 are reserved')
    global.app.contractTypeMapping[type] = name
  }
  global.app.getContractName = type => global.app.contractTypeMapping[type]

  global.app.registerFee = (type, min, currency) => {
    global.app.feeMapping[type] = {
      currency: currency || global.app.defaultFee.currency,
      min,
    }
  }
  global.app.getFee = type => global.app.feeMapping[type]

  global.app.setDefaultFee = (min, currency) => {
    global.app.defaultFee.currency = currency
    global.app.defaultFee.min = min
  }

  global.app.addRoundFee = (fee, roundNumber) => {
    modules.blocks.increaseRoundData({ fees: fee }, roundNumber)
  }

  global.app.getRealTime = epochTime => slots.getRealTime(epochTime)

  global.app.registerHook = (name, func) => {
    global.app.hooks[name] = func
  }

  app.checkMultiSignature = (bytes, allowedKeys, signatures, m) => {
    const keysigs = signatures.split(',')
    const publicKeys = []
    const sigs = []
    for (const ks of keysigs) {
      if (ks.length !== 192) throw new Error('Invalid public key or signature')
      publicKeys.push(ks.substr(0, 64))
      sigs.push(ks.substr(64, 192))
    }
    const uniqPublicKeySet = new Set()
    for (const pk of publicKeys) {
      uniqPublicKeySet.add(pk)
    }
    if (uniqPublicKeySet.size !== publicKeys.length) throw new Error('Duplicated public key')

    let sigCount = 0
    for (let i = 0; i < publicKeys.length; ++i) {
      const pk = publicKeys[i]
      const sig = sigs[i]
      if (allowedKeys.indexOf(pk) !== -1 && app.verifyBytes(bytes, pk, sig)) {
        sigCount++
      }
    }
    if (sigCount < m) throw new Error('Signatures not enough')
  }

  app.isCurrentBookkeeper = addr => modules.delegates.getBookkeeperAddresses().has(addr)

  app.executeContract = async (context) => {
    context.activating = 1
    const error = await library.base.transaction.apply(context)
    if (!error) {
      const trs = await app.sdb.get('Transaction', { id: context.trs.id })
      if (!transactionMode.isRequestMode(context.trs.mode)) throw new Error('Transaction mode is not request mode')

      app.sdb.update('TransactionStatu', { executed: 1 }, { tid: context.trs.id })
      app.addRoundFee(trs.fee, modules.round.calc(context.block.height))
    }
    return error
  }

  app.AccountRole = {
    DELEGATE: 1,
    AGENT: 2,
    GATEWAY_VALIDATOR: 3,
  }

  const { appDir, dataDir } = options.appConfig

  const BLOCK_HEADER_DIR = path.resolve(dataDir, 'blocks')
  const BLOCK_DB_PATH = path.resolve(dataDir, 'blockchain.db')

  adaptSmartDBLogger(options.appConfig)
  global.app.sdb = new AschCore.SmartDB(BLOCK_DB_PATH, BLOCK_HEADER_DIR)
  global.app.balances = new BalanceManager(global.app.sdb)
  global.app.autoID = new AutoIncrement(global.app.sdb)
  global.app.events = new EventEmitter()

  global.app.util = {
    address: address,
    bignumber: bignumber,
    transactionMode: transactionMode,
  }

  await loadModels()
  await loadContracts()
  await loadInterfaces(options.library.network.app)

  global.app.contractTypeMapping[0] = 'basic.transfer'
  global.app.contractTypeMapping[1] = 'basic.setUserName'
  global.app.contractTypeMapping[2] = 'basic.setSecondPassphrase'
  global.app.contractTypeMapping[3] = 'basic.lock'
  global.app.contractTypeMapping[4] = 'basic.vote'
  global.app.contractTypeMapping[5] = 'basic.unvote'
  global.app.contractTypeMapping[10] = 'basic.registerDelegate'

  global.app.contractTypeMapping[100] = 'uia.registerIssuer'
  global.app.contractTypeMapping[101] = 'uia.registerAsset'
  global.app.contractTypeMapping[102] = 'uia.issue'
  global.app.contractTypeMapping[103] = 'uia.transfer'
}
