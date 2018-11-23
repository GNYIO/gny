import fs = require('fs');
import path = require('path');
import util = require('util');
import { EventEmitter } from 'events';
import * as _ from 'lodash';
import changeCase = require('change-case');
import validate = require('validate.js');
import { AschCore } from 'asch-smartdb';
import slots = require('./utils/slots');
import amountHelper = require('./utils/amount');
import Router = require('./utils/router');
import BalanceManager = require('./smartdb/balance-manager');
import AutoIncrement = require('./smartdb/auto-increment');
import AccountRole = require('./utils/account-role');
import transactionMode = require('./utils/transaction-mode');
import loadModels from './loadModels'

import address from './utils/address.js';
import bignumber from './utils/bignumber';
import transaction from './model/transaction';

const PIFY = util.promisify

class RouteWrapper {
  constructor() {
    this.hands = []
    this.routePath = null
  }

  get(routePath, handler) {
    this.handlers.push({ path: routePath, method: 'get', handler })
  }

  put(routePath, handler) {
    this.handlers.push({ path: routePath, method: 'put', handler })
  }

  post(routePath, handler) {
    this.handlers.push({ path: routePath, method: 'post', handler })
  }

  set path(val) {
    this.routePath = val
  }

  get path() {
    return this.routePath
  }

  get handlers() {
    return this.hands
  }
}

async function loadContracts(dir) {
  let contractFiles
  try {
    contractFiles = await PIFY(fs.readdir)(dir)
  } catch (e) {
    app.logger.error(`contracts load error: ${e}`)
    return
  }
  contractFiles.forEach((contractFile) => {
    app.logger.info('loading contract', contractFile)
    const basename = path.basename(contractFile, '.js')
    const contractName = changeCase.snakeCase(basename)
    const fullpath = path.resolve(dir, contractFile)
    const contract = require(fullpath)
    if (contractFile !== 'index.js') {
      app.contract[contractName] = contract
    }
  })
}

async function loadInterfaces(dir, routes) {
  let interfaceFiles
  try {
    interfaceFiles = await PIFY(fs.readdir)(dir)
  } catch (e) {
    app.logger.error(`interfaces load error: ${e}`)
    return
  }
  for (const f of interfaceFiles) {
    app.logger.info('loading interface', f)
    const basename = path.basename(f, '.js')
    const rw = new RouteWrapper()
    require(path.resolve(dir, f))(rw)
    const router = new Router()
    for (const h of rw.handlers) {
      router[h.method](h.path, (req, res) => {
        (async () => {
          try {
            const result = await h.handler(req)
            let response = { success: true }
            if (util.isObject(result) && !Array.isArray(result)) {
              response = _.assign(response, result)
            } else if (!util.isNullOrUndefined(result)) {
              response.data = result
            }
            res.send(response)
          } catch (e) {
            res.status(500).send({ success: false, error: e.message })
          }
        })()
      })
    }
    if (!rw.path) {
      rw.path = `/api/v2/${basename}`
    }
    routes.use(rw.path, router)
  }
}

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

module.exports = async function runtime(options) {
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
  app.validators = {
    amount: value => amountHelper.validate(value),
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
  app.validate = (type, value, constraints) => {
    if (!app.validators[type]) throw new Error(`Validator not found: ${type}`)
    const error = app.validators[type](value, constraints)
    if (error) throw new Error(error)
  }
  app.registerContract = (type, name) => {
    // if (type < 1000) throw new Error('Contract types that small than 1000 are reserved')
    app.contractTypeMapping[type] = name
  }
  app.getContractName = type => app.contractTypeMapping[type]

  app.registerFee = (type, min, currency) => {
    app.feeMapping[type] = {
      currency: currency || app.defaultFee.currency,
      min,
    }
  }
  app.getFee = type => app.feeMapping[type]

  app.setDefaultFee = (min, currency) => {
    app.defaultFee.currency = currency
    app.defaultFee.min = min
  }

  app.addRoundFee = (fee, roundNumber) => {
    modules.blocks.increaseRoundData({ fees: fee }, roundNumber)
  }

  app.getRealTime = epochTime => slots.getRealTime(epochTime)

  app.registerHook = (name, func) => {
    app.hooks[name] = func
  }

  app.verifyBytes = (bytes, pk, signature) => app.api.crypto.verify(pk, signature, bytes);

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

  app.AccountRole = AccountRole

  const { appDir, dataDir } = options.appConfig

  const BLOCK_HEADER_DIR = path.resolve(dataDir, 'blocks')
  const BLOCK_DB_PATH = path.resolve(dataDir, 'blockchain.db')
  debugger

  adaptSmartDBLogger(options.appConfig)
  app.sdb = new AschCore.SmartDB(BLOCK_DB_PATH, BLOCK_HEADER_DIR)
  app.balances = new BalanceManager(app.sdb)
  app.autoID = new AutoIncrement(app.sdb)
  app.events = new EventEmitter()

  app.util = {
    address: address,
    bignumber: bignumber,
    transactionMode: transactionMode,
  }

  await loadModels()
  await loadContracts(path.join(appDir, 'contract'))
  // await loadInterfaces(path.join(appDir, 'interface'), options.library.network.app)

  app.contractTypeMapping[0] = 'basic.transfer'
  app.contractTypeMapping[1] = 'basic.setUserName'
  app.contractTypeMapping[2] = 'basic.setSecondPassphrase'
  app.contractTypeMapping[3] = 'basic.lock'
  app.contractTypeMapping[4] = 'basic.vote'
  app.contractTypeMapping[5] = 'basic.unvote'

  app.contractTypeMapping[100] = 'uia.registerIssuer'
  app.contractTypeMapping[101] = 'uia.registerAsset'
  app.contractTypeMapping[102] = 'uia.issue'
  app.contractTypeMapping[103] = 'uia.transfer'
}
