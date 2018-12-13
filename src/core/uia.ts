import * as crypto from 'crypto';
import jsonSql = require('json-sql');

jsonSql().setDialect('sqlite')

import * as ed from '../utils/ed';
import Router from '../utils/router';
import addressHelper = require('../utils/address');
import { Modules, IScope } from '../interfaces';


// Constructor
export default class UIA {
  private readonly library: IScope;
  private modules: Modules;

  constructor (scope: IScope) {
    this.library = scope
    this.attachApi();
  }

  // Private methods
  private attachApi = () => {
    const router1 = new Router();
    const router = router1.router;

    router.use((req, res, next) => {
      if (this.modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' })
    })

    router.map(this, {
      'get /issuers': 'getIssuers',
      'get /issuers/:name': 'getIssuer',
      'get /issuers/:name/assets': 'getIssuerAssets',
      'get /assets': 'getAssets',
      'get /assets/:name': 'getAsset',
      'get /balances/:address': 'getBalances',
      'get /balances/:address/:currency': 'getBalance',
      'put /transfers': 'transferAsset',
    })

    router.use((req, res) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' })
    })

    this.library.network.app.use('/api/uia', router)
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err)
      return res.status(500).send({ success: false, error: err.toString() })
    })
  }

  // Public methods
  trimPrecision(amount: any, precision: any) {
    const s = amount.toString()
    return String(Number.parseInt(s.substr(0, s.length - precision), 10))
  }

  toAPIV1UIABalances = (balances: any) => {
    if (!(balances && Array.isArray(balances) && balances.length > 0)) return balances
    const assetMap = new Map()
    global.app.sdb.getAll('Asset').forEach((asset: any) => assetMap.set(asset.name, this.toAPIV1Asset(asset)))

    return balances.map((b: any) => {
      b.balance = String(b.balance)
      return assetMap.has(b.currency) ? Object.assign(b, assetMap.get(b.currency)) : b
    })
  }

  toAPIV1Assets = (assets: any) => ((assets && Array.isArray(assets) && assets.length > 0)
    ? assets.map((a: any) => this.toAPIV1Asset(a))
    : [])

  toAPIV1Asset = (asset: any) => {
    if (!asset) return asset

    return {
      name: asset.name,
      desc: asset.desc,
      maximum: String(asset.maximum),
      precision: asset.precision,
      quantity: String(asset.quantity),
      issuerId: asset.issuerId,
      height: asset.height,
      writeoff: 0,
      maximumShow: this.trimPrecision(asset.maximum, asset.precision),
      quantityShow: this.trimPrecision(asset.quantity, asset.precision),

      // "strategy"  => missing
      // "acl" => missing
      // "allowWriteoff" => missing
      // "allowWhitelist" => missing
      // "allowBlacklist" => missing
    }
  }

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope
  }

  // Shared
  getIssuers = (req, cb) => {
    const query = req.body
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
        offset: {
          type: 'integer',
          minimum: 0,
        },
      },
    }, (err) => {
      if (err) return cb(`Invalid parameters: ${err[0]}`)
      return (async () => {
        try {
          const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 }
          const count = await global.app.sdb.count('Issuer', {})
          const issues = await global.app.sdb.find('Issuer', {}, limitAndOffset)
          return cb(null, { count, issues })
        } catch (dbErr) {
          return cb(`Failed to get issuers: ${dbErr}`)
        }
      })()
    })
  }

  getIssuerByAddress = (req, cb) => {
    if (!req.params || !addressHelper.isAddress(req.params.address)) {
      return cb('Invalid address')
    }
    return (async () => {
      try {
        const issues = await global.app.sdb.find('Issuer', { address: req.params.address })
        if (!issues || issues.length === 0) return cb('Issuer not found')
        return cb(null, { issuer: issues[0] })
      } catch (dbErr) {
        return cb(`Failed to get issuer: ${dbErr}`)
      }
    })()
  }

  getIssuer = (req, cb) => {
    if (req.params && addressHelper.isAddress(req.params.name)) {
      req.params.address = req.params.name
      return this.getIssuerByAddress(req, cb)
    }
    const query = req.params
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 16,
        },
      },
      required: ['name'],
    }, (err) => {
      if (err) return cb(`Invalid parameters: ${err[0]}`)

      return (async () => {
        try {
          const issuers = await global.app.sdb.find('Issuer', { name: req.params.name })
          if (!issuers || issuers.length === 0) return cb('Issuer not found')
          return cb(null, { issuer: issuers[0] })
        } catch (dbErr) {
          return cb(`Failed to get issuers: ${dbErr}`)
        }
      })()
    })
    return null
  }

  getIssuerAssets = (req, cb) => {
    if (!req.params || !req.params.name || req.params.name.length > 32) {
      cb(' Invalid parameters')
      return
    }
    const query = req.body
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
        offset: {
          type: 'integer',
          minimum: 0,
        },
      },
    }, (err) => {
      if (err) return cb(`Invalid parameters: ${err[0]}`)

      return (async () => {
        try {
          const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 }
          const condition = { issuerName: req.params.name }
          const count = await global.app.sdb.count('Asset', condition)
          const assets = await global.app.sdb.find('Asset', condition, limitAndOffset)
          return cb(null, { count, assets: this.toAPIV1Assets(assets) })
        } catch (dbErr) {
          return cb(`Failed to get assets: ${dbErr}`)
        }
      })()
    })
  }

  getAssets = (req, cb) => {
    const query = req.body
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
        offset: {
          type: 'integer',
          minimum: 0,
        },
      },
    }, (err) => {
      if (err) return cb(`Invalid parameters: ${err[0]}`)
      return (async () => {
        try {
          const condition = {}
          const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 }
          const count = await global.app.sdb.count('Asset', condition)
          const assets = await global.app.sdb.find('Asset', condition, limitAndOffset)
          return cb(null, { count, assets: this.toAPIV1Assets(assets) })
        } catch (dbErr) {
          return cb(`Failed to get assets: ${dbErr}`)
        }
      })()
    })
  }

  getAsset = (req, cb) => {
    const query = req.params
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 32,
        },
      },
      required: ['name'],
    }, (err) => {
      if (err) cb(`Invalid parameters: ${err[0]}`)

      return (async () => {
        try {
          const condition = { name: query.name }
          const assets = await global.app.sdb.find('Asset', condition)
          if (!assets || assets.length === 0) return cb('Asset not found')
          return cb(null, { asset: this.toAPIV1Asset(assets[0]) })
        } catch (dbErr) {
          return cb(`Failed to get asset: ${dbErr}`)
        }
      })()
    })
  }


  getBalances = (req, cb) => {
    if (!req.params || !addressHelper.isAddress(req.params.address)) {
      return cb('Invalid address')
    }
    const query = req.body
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
        offset: {
          type: 'integer',
          minimum: 0,
        },
      },
    }, (err) => {
      if (err) return cb(`Invalid parameters: ${err[0]}`)

      return (async () => {
        try {
          const condition = { address: req.params.address }
          const count = await global.app.sdb.count('Balance', condition)
          const resultRange = { limit: query.limit, offset: query.offset }
          const balances = await global.app.sdb.find('Balance', condition, resultRange)
          return cb(null, { count, balances: this.toAPIV1UIABalances(balances) })
        } catch (dbErr) {
          return cb(`Failed to get balances: ${dbErr}`)
        }
      })()
    })
    return null
  }

  getBalance = (req, cb) => {
    if (!req.params) return cb('Invalid parameters')
    if (!addressHelper.isAddress(req.params.address)) return cb('Invalid address')
    if (!req.params.currency || req.params.currency.length > 22) return cb('Invalid currency')

    return (async () => {
      try {
        const condition = { address: req.params.address, currency: req.params.currency }
        let balances = await global.app.sdb.find('Balance', condition)
        if (!balances || balances.length === 0) return cb('Balance info not found')
        balances = this.toAPIV1UIABalances(balances)
        return cb(null, { balance: balances[0] })
      } catch (dbErr) {
        return cb(`Failed to get issuers: ${dbErr}`)
      }
    })()
  }

  transferAsset = (req, cb) => {
    const query = req.body
    const valid = this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        secret: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
        currency: {
          type: 'string',
          maxLength: 22,
        },
        amount: {
          type: 'string',
          maxLength: 50,
        },
        recipientId: {
          type: 'string',
          minLength: 1,
        },
        publicKey: {
          type: 'string',
          format: 'publicKey',
        },
        secondSecret: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
        multisigAccountPublicKey: {
          type: 'string',
          format: 'publicKey',
        },
        message: {
          type: 'string',
          maxLength: 256,
        },
        fee: {
          type: 'integer',
          minimum: 10000000,
        },
      },
      required: ['secret', 'amount', 'recipientId', 'currency'],
    })

    if (!valid) {
      this.library.logger.warn('Failed to validate query params', this.library.scheme.getLastError())
      return setImmediate(cb, this.library.scheme.getLastError().details[0].message)
    }

    return this.library.sequence.add((callback) => {
      (async () => {
        try {
          const hash = crypto.createHash('sha256').update(query.secret, 'utf8').digest()
          const keypair = ed.generateKeyPair(hash)
          let secondKeypair = null
          if (query.secondSecret) {
            secondKeypair = ed.generateKeyPair(crypto.createHash('sha256').update(query.secondSecret, 'utf8').digest())
          }
          const trs = this.library.base.transaction.create({
            secret: query.secret,
            fee: query.fee || 10000000,
            type: 103,
            senderId: query.senderId || null,
            args: [query.currency, query.amount, query.recipientId],
            message: query.message || null,
            secondKeypair,
            keypair,
          })
          await this.modules.transactions.processUnconfirmedTransactionAsync(trs)
          this.library.bus.message('unconfirmedTransaction', trs)
          callback(null, { transactionId: trs.id })
        } catch (e) {
          this.library.logger.warn('Failed to process unsigned transaction', e)
          callback(e.toString())
        }
      })()
    }, cb)
  }

}
