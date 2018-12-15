import * as express from 'express'
import * as ed from '../../src/utils/ed'
import * as crypto from 'crypto'
import { Modules, IScope } from '../../src/interfaces'
import BlockReward from '../../src/utils/block-reward';

export default class DelegatesApi {

  private modules: Modules;
  private library: IScope;
  private loaded = false;
  private blockreward = new BlockReward();
  constructor (modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

    // Events
    public onBlockchainReady = () => {
      this.loaded = true;
    }

  public count = async (req, cb) => {
    try {
      const count = global.app.sdb.getAll('Delegate').length
      return cb(null, { count })
    } catch (e) {
      this.library.logger.error('get delegate count error', e)
      return cb('Failed to count delegates')
    }
  }

  public getVoters = (req, cb) => {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          maxLength: 50,
        },
      },
      required: ['name'],
    }, (err) => {
      if (err) {
        return cb(err[0].message);
      }
  
      return (async () => {
        try {
          const votes = await global.app.sdb.findAll('Vote', { condition: { delegate: query.name } })
          if (!votes || !votes.length) return cb(null, { accounts: [] })
  
          const addresses = votes.map(v => v.address)
          const accounts = await global.app.sdb.findAll('Account', { condition: { address: { $in: addresses } } })
          const lastBlock = this.modules.blocks.getLastBlock()
          const totalSupply = this.blockreward.calculateSupply(lastBlock.height)
          for (const a of accounts) {
            a.balance = a.gny
            a.weightRatio = (a.weight * 100) / totalSupply
          }
          return cb(null, { accounts })
        } catch (e) {
          this.library.logger.error('Failed to find voters', e)
          return cb('Server error')
        }
      })()
    })
  }

  public getDelegate = (req, cb) => {
    const query = req.body
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        publicKey: {
          type: 'string',
        },
        name: {
          type: 'string',
        },
        address: {
          type: 'string',
        },
      },
    }, (err) => {
      if (err) {
        return cb(err[0].message)
      }
  
      return this.modules.delegates.getDelegates(query, (err2, delegates) => {
        if (err2) {
          return cb(err2)
        }
  
        const delegate = delegates.find((d) => {
          if (query.publicKey) {
            return d.publicKey === query.publicKey
          }
          if (query.address) {
            return d.address === query.address
          }
          if (query.name) {
            return d.name === query.name
          }
  
          return false
        })
  
        if (delegate) {
          return cb(null, { delegate })
        }
        return cb('Delegate not found')
      })
    })
  }

  public getDelegates = (req, cb) => {
    const query = req.body
    const offset = Number(query.offset || 0)
    const limit = Number(query.limit || 10)
    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      return cb('Invalid params')
    }
  
    return this.getDelegates({}, (err, delegates) => {
      if (err) return cb(err)
      return cb(null, {
        totalCount: delegates.length,
        delegates: delegates.slice(offset, offset + limit),
      })
    })
  }

  private attachApi = () => {
    const router = express.Router();

    router.use((req, res, next) => {
      if (this.modules && this.loaded) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' })
    })

    router.get('/count', this.count);
    router.get('/voters', this.getVoters);
    router.get('/get', this.getDelegate);
    router.get('/', this.getDelegates);

    if (process.env.DEBUG) {
      router.get('/forging/disableAll', (req, res) => {
        this.modules.delegates.disableForging()
        return res.json({ success: true })
      })

      router.get('/forging/enableAll', (req, res) => {
        this.modules.delegates.enableForging()
        return res.json({ success: true })
      })
    }

    router.post('/forging/enable', (req, res) => {
      const body = req.body
      this.library.scheme.validate(body, {
        type: 'object',
        properties: {
          secret: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          publicKey: {
            type: 'string',
            format: 'publicKey',
          },
        },
        required: ['secret'],
      }, (err) => {
        if (err) {
          return res.json({ success: false, error: err[0].message })
        }

        const ip = req.connection.remoteAddress

        if (this.library.config.forging.access.whiteList.length > 0
          && this.library.config.forging.access.whiteList.indexOf(ip) < 0) {
          return res.json({ success: false, error: 'Access denied' })
        }

        const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest())

        if (body.publicKey) {
          if (keypair.publicKey.toString('hex') !== body.publicKey) {
            return res.json({ success: false, error: 'Invalid passphrase' })
          }
        }

        if (this.modules.delegates.isPublicKeyInKeyPairs(keypair.publicKey.toString('hex'))) {
          return res.json({ success: false, error: 'Forging is already enabled' })
        }

        return this.modules.accounts.getAccount({ publicKey: keypair.publicKey.toString('hex') }, (err2, account) => {
          if (err2) {
            return res.json({ success: false, error: err2.toString() })
          }
          if (account && account.isDelegate) {
            this.modules.delegates.setKeyPair(keypair.publicKey.toString('hex'), keypair)
            this.library.logger.info(`Forging enabled on account: ${account.address}`)
            return res.json({ success: true, address: account.address })
          }
          return res.json({ success: false, error: 'Delegate not found' })
        })
      })
    })

    router.post('/forging/disable', (req, res) => {
      const body = req.body
      this.library.scheme.validate(body, {
        type: 'object',
        properties: {
          secret: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          publicKey: {
            type: 'string',
            format: 'publicKey',
          },
        },
        required: ['secret'],
      }, (err) => {
        if (err) {
          return res.json({ success: false, error: err[0].message })
        }

        const ip = req.connection.remoteAddress

        if (this.library.config.forging.access.whiteList.length > 0
            && this.library.config.forging.access.whiteList.indexOf(ip) < 0) {
          return res.json({ success: false, error: 'Access denied' })
        }

        const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest())

        if (body.publicKey) {
          if (keypair.publicKey.toString('hex') !== body.publicKey) {
            return res.json({ success: false, error: 'Invalid passphrase' })
          }
        }

        if (!this.modules.delegates.isPublicKeyInKeyPairs(keypair.publicKey.toString('hex'))) {
          return res.json({ success: false, error: 'Delegate not found' })
        }

        return this.modules.accounts.getAccount({ publicKey: keypair.publicKey.toString('hex') }, (err2, account) => {
          if (err2) {
            return res.json({ success: false, error: err2.toString() })
          }
          if (account && account.isDelegate) {
            this.modules.delegates.removeKeyPair(keypair.publicKey.toString('hex'))
            this.library.logger.info(`Forging disabled on account: ${account.address}`)
            return res.json({ success: true, address: account.address })
          }
          return res.json({ success: false, error: 'Delegate not found' })
        })
      })
    })

    router.get('/forging/status', (req, res) => {
      const query = req.query
      this.library.scheme.validate(query, {
        type: 'object',
        properties: {
          publicKey: {
            type: 'string',
            format: 'publicKey',
          },
        },
        required: ['publicKey'],
      }, (err) => {
        if (err) {
          return res.json({ success: false, error: err[0].message })
        }

        return res.json({
          success: true,
          enabled: !!this.modules.delegates.isPublicKeyInKeyPairs(query.publicKey)
        })
      })
    })

    this.library.network.app.use('/api/delegates', router)
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err.toString())
      return res.status(500).send({ success: false, error: err.toString() })
    })
  }
}