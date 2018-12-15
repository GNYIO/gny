import * as ed from '../../src/utils/ed';
import addressHelper from '../../src/utils/address'
import * as crypto from 'crypto';
import * as express from 'express';
import { Modules, IScope } from '../../src/interfaces';

export default class UiaApi {
  private modules : Modules;
  private library: IScope;
  constructor(modules: Modules, scope: IScope) {
    this.modules = modules;
    this.library = scope;

    this.attachApi();
  }

  private getIssuers = (req, cb) => {
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

  private getIssuer = (req, cb) => {
    if (req.params && addressHelper.isAddress(req.params.name)) {
      req.params.address = req.params.name
      return this.modules.uia.getIssuerByAddress(req, cb)
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
          return cb(null, { count, assets: assets })
        } catch (dbErr) {
          return cb(`Failed to get assets: ${dbErr}`)
        }
      })()
    })
  }

  private getAssets = (req, cb) => {
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
          return cb(null, { count, assets: assets })
        } catch (dbErr) {
          return cb(`Failed to get assets: ${dbErr}`)
        }
      })()
    })
  }

  private getAsset = (req, cb) => {
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
          return cb(null, { asset: assets[0] })
        } catch (dbErr) {
          return cb(`Failed to get asset: ${dbErr}`)
        }
      })()
    })
  }

  private getBalances = (req, cb) => {
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
          return cb(null, { count, balances: balances })
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
        balances = balances
        return cb(null, { balance: balances[0] })
      } catch (dbErr) {
        return cb(`Failed to get issuers: ${dbErr}`)
      }
    })()
  }


  private transferAsset = (req, cb) => {
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


  private attachApi = () => {
    const router = express.Router();

    router.use((req, res, next) => {
      if (this.modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' })
    });

    router.get('/issuers', this.getIssuers);
    router.get('/issuers/:name', this.getIssuer);
    router.get('/issuers/:name/assets', this.getIssuerAssets);
    router.get('/assets', this.getAssets);
    router.get('/assets/:name', this.getAsset);
    router.get('/balances/:address', this.getBalances);
    router.get('/balances/:address/:currency', this.getBalance);
    router.put('/transfers', this.transferAsset);

    // router.map(this, {
    //   'get /issuers': 'getIssuers',
    //   'get /issuers/:name': 'getIssuer',
    //   'get /issuers/:name/assets': 'getIssuerAssets',
    //   'get /assets': 'getAssets',
    //   'get /assets/:name': 'getAsset',
    //   'get /balances/:address': 'getBalances',
    //   'get /balances/:address/:currency': 'getBalance',
    //   'put /transfers': 'transferAsset',
    // })

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
}