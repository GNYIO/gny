import * as crypto from 'crypto';
import * as util from 'util';
import * as ed from '../utils/ed'
import Router from '../utils/router'
import * as slots from '../utils/slots';
import BlockStatus from '../utils/block-status';
import addressHelper from '../utils/address'

export default class Delegates {
  private loaded: boolean = false;
  private blockStatus = new BlockStatus();
  private keyPairs: any = {};
  private isForgingEnabled: boolean = true;

  private library: any;
  private modules: any;

  private readonly BOOK_KEEPER_NAME = 'round_bookkeeper'

  constructor(scope: any) {
    this.library = scope;

    this.attachApi();
  }

  private attachApi = () => {
    const router1 = new Router();
    const router = router1.router;
    console.log(router);
  
    router.use((req, res, next) => {
      if (this.modules && this.loaded) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' })
    })
  
    router.map(this.shared, {
      'get /count': 'count',
      'get /voters': 'getVoters',
      'get /get': 'getDelegate',
      'get /': 'getDelegates',
    })
  
    if (process.env.DEBUG) {
      router.get('/forging/disableAll', (req, res) => {
        this.disableForging()
        return res.json({ success: true })
      })
  
      router.get('/forging/enableAll', (req, res) => {
        this.enableForging()
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
  
        const keypair = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest())
  
        if (body.publicKey) {
          if (keypair.publicKey.toString('hex') !== body.publicKey) {
            return res.json({ success: false, error: 'Invalid passphrase' })
          }
        }
  
        if (this.keyPairs[keypair.publicKey.toString('hex')]) {
          return res.json({ success: false, error: 'Forging is already enabled' })
        }
  
        return this.modules.accounts.getAccount({ publicKey: keypair.publicKey.toString('hex') }, (err2, account) => {
          if (err2) {
            return res.json({ success: false, error: err2.toString() })
          }
          if (account && account.isDelegate) {
            this.keyPairs[keypair.publicKey.toString('hex')] = keypair
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
  
        const keypair = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest())
  
        if (body.publicKey) {
          if (keypair.publicKey.toString('hex') !== body.publicKey) {
            return res.json({ success: false, error: 'Invalid passphrase' })
          }
        }
  
        if (!this.keyPairs[keypair.publicKey.toString('hex')]) {
          return res.json({ success: false, error: 'Delegate not found' })
        }
  
        return this.modules.accounts.getAccount({ publicKey: keypair.publicKey.toString('hex') }, (err2, account) => {
          if (err2) {
            return res.json({ success: false, error: err2.toString() })
          }
          if (account && account.isDelegate) {
            delete this.keyPairs[keypair.publicKey.toString('hex')]
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
  
        return res.json({ success: true, enabled: !!this.keyPairs[query.publicKey] })
      })
    })
  
    this.library.network.app.use('/api/delegates', router)
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err.toString())
      return res.status(500).send({ success: false, error: err.toString() })
    })
  }

  private getBlockSlotData = (slot: any, height: any) => {
    let activeDelegates: any = this.generateDelegateList(height);
    if (!activeDelegates) {
      return
    }
    const lastSlot = slots.getLastSlot(slot)

    for (let currentSlot = slot; currentSlot < lastSlot; currentSlot += 1) {
      const delegatePos = currentSlot % slots.delegates

      const delegateKey = activeDelegates[delegatePos]

      if (delegateKey && this.keyPairs[delegateKey]) {
        return {
          time: slots.getSlotTime(currentSlot),
          keypair: this.keyPairs[delegateKey],
        }
      }
    }
  }

  loop = (cb: any) => {
    if (!this.isForgingEnabled) {
      this.library.logger.trace('Loop:', 'forging disabled')
      return setImmediate(cb)
    }
    if (!Object.keys(this.keyPairs).length) {
      this.library.logger.trace('Loop:', 'no delegates')
      return setImmediate(cb)
    }

    if (!this.loaded || this.modules.loader.syncing()) {
      this.library.logger.trace('Loop:', 'node not ready')
      return setImmediate(cb)
    }

    const currentSlot = slots.getSlotNumber()
    const lastBlock = this.modules.blocks.getLastBlock()

    if (currentSlot === slots.getSlotNumber(lastBlock.timestamp)) {
      return setImmediate(cb)
    }

    if (Date.now() % 10000 > 5000) {
      this.library.logger.trace('Loop:', 'maybe too late to collect votes')
      return setImmediate(cb)
    }

    return this.getBlockSlotData(currentSlot, lastBlock.height + 1, (err, currentBlockData) => {
      if (err || currentBlockData === null) {
        this.library.logger.trace('Loop:', 'skipping slot')
        return setImmediate(cb)
      }

      return library.sequence.add(done => (async () => {
        try {
          if (slots.getSlotNumber(currentBlockData.time) === slots.getSlotNumber()
            && modules.blocks.getLastBlock().timestamp < currentBlockData.time) {
            await modules.blocks.generateBlock(currentBlockData.keypair, currentBlockData.time)
          }
          done()
        } catch (e) {
          done(e)
        }
      })(), (err2) => {
        if (err2) {
          library.logger.error('Failed generate block within slot:', err2)
        }
        cb()
      })
    })
  }

  private loadMyDelegates = async () => {
    let secrets = []
    if (this.library.config.forging.secret) {
      secrets = Array.isArray(this.library.config.forging.secret)
        ? this.library.config.forging.secret : [this.library.config.forging.secret]
    }
  
    try {
      const delegates = app.sdb.getAll('Delegate')
      if (!delegates || !delegates.length) {
        return 'Delegates not found in db'
      }
      const delegateMap = new Map()
      for (const d of delegates) {
        delegateMap.set(d.publicKey, d)
      }
      for (const secret of secrets) {
        const keypair = ed.MakeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest())
        const publicKey = keypair.publicKey.toString('hex')
        if (delegateMap.has(publicKey)) {
          this.keyPairs[publicKey] = keypair;
          this.library.logger.info(`Forging enabled on account: ${delegateMap.get(publicKey).address}`)
        } else {
          this.library.logger.info(`Delegate with this public key not found: ${keypair.publicKey.toString('hex')}`)
        }
      }
    } catch (e) {
      return e
    }
  }

  public getActiveDelegateKeypairs = (height, cb) => {
    this.generateDelegateList(height, (err, delegates) => {
      if (err) {
        return cb(err)
      }
      const results = []
      for (const key in this.keyPairs) {
        if (delegates.indexOf(key) !== -1) {
          results.push(this.keyPairs[key])
        }
      }
      return cb(null, results)
    })
  }

  public validateProposeSlot = (propose, cb) => {
    this.generateDelegateList(propose.height, (err, activeDelegates) => {
      if (err) {
        return cb(err)
      }
      const currentSlot = slots.getSlotNumber(propose.timestamp)
      const delegateKey = activeDelegates[currentSlot % slots.delegates]
  
      if (delegateKey && propose.generatorPublicKey === delegateKey) {
        return cb()
      }
  
      return cb('Failed to validate propose slot')
    })
  }

  public generateDelegateList = (height: any) => {
    try {
      const truncDelegateList = this.getBookkeeper()
      const seedSource = this.modules.round.calc(height).toString()
  
      let currentSeed = crypto.createHash('sha256').update(seedSource, 'utf8').digest()
      for (let i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
        for (let x = 0; x < 4 && i < delCount; i++, x++) {
          const newIndex = currentSeed[x] % delCount
          const b = truncDelegateList[newIndex]
          truncDelegateList[newIndex] = truncDelegateList[i]
          truncDelegateList[i] = b
        }
        currentSeed = crypto.createHash('sha256').update(currentSeed).digest()
      }
  
      return truncDelegateList
    } catch (e) {
      return
    }
  }


  public fork = (block, cause) => {
    this.library.logger.info('Fork', {
      delegate: block.delegate,
      block: {
        id: block.id,
        timestamp: block.timestamp,
        height: block.height,
        prevBlockId: block.prevBlockId,
      },
      cause,
    })
  }
  
  public validateBlockSlot = (block, cb) => {
    this.generateDelegateList(block.height, (err, activeDelegates) => {
      if (err) {
        return cb(err)
      }
      const currentSlot = slots.getSlotNumber(block.timestamp)
      const delegateKey = activeDelegates[currentSlot % 101]
  
      if (delegateKey && block.delegate === delegateKey) {
        return cb()
      }
  
      return cb(`Failed to verify slot, expected delegate: ${delegateKey}`)
    })
  }
  
  // fixme ?? : get method should not modify anything....
  public getDelegates = (query, cb) => {
    let delegates = app.sdb.getAll('Delegate').map(d => Object.assign({}, d))
    if (!delegates || !delegates.length) return cb('No delegates')
  
    delegates = delegates.sort(this.compare)
  
    const lastBlock = this.modules.blocks.getLastBlock()
    const totalSupply = this.blockStatus.calcSupply(lastBlock.height)
    for (let i = 0; i < delegates.length; ++i) {
      // fixme? d === delegates[i] ???
      const d = delegates[i]
      d.rate = i + 1
      delegates[i].approval = ((d.votes / totalSupply) * 100)
  
      let percent = 100 - (d.missedBlocks / (d.producedBlocks + d.missedBlocks) / 100)
      percent = percent || 0
      delegates[i].productivity = parseFloat(Math.floor(percent * 100) / 100).toFixed(2)
  
      delegates[i].vote = delegates[i].votes
      delegates[i].missedblocks = delegates[i].missedBlocks
      delegates[i].producedblocks = delegates[i].producedBlocks
      app.sdb.update('Delegate', delegates[i], { address: delegates[i].address })
    }
    return cb(null, delegates)
  }
  
  // sandboxApi = (call, args, cb) => {
  //   sandboxHelper.callMethod(shared, call, args, cb)
  // }
  
  enableForging = () => {
    this.isForgingEnabled = true
  }
  
  disableForging = () => {
    this.isForgingEnabled = false
  }
  



  // Events
  onBind = (scope) => {
    this.modules = scope
  }

  public onBlockchainReady = () => {
    this.loaded = true

    this.loadMyDelegates(function nextLoop(err) {
      if (err) {
        library.logger.error('Failed to load delegates', err)
      }

      this.loop(() => {
        setTimeout(nextLoop, 100)
      })
    })
  }

  public compare = (l, r) => {
    if (l.votes !== r.votes) {
      return r.votes - l.votes
    }
    return l.publicKey < r.publicKey ? 1 : -1
  }

  cleanup = (cb) => {
    this.loaded = false
    cb()
  }

  getTopDelegates = () => {
    const allDelegates = app.sdb.getAll('Delegate')
    return allDelegates.sort(this.compare).map(d => d.publicKey).slice(0, 101)
  }

  getBookkeeperAddresses = () => {
    const bookkeeper = this.getBookkeeper()
    const addresses = new Set()
    for (const i of bookkeeper) {
      const address = addressHelper.generateNormalAddress(i)
      addresses.add(address)
    }
    return addresses
  }

  getBookkeeper = () => {
    const item = app.sdb.get('Variable', this.BOOK_KEEPER_NAME)
    if (!item) throw new Error('Bookkeeper variable not found')

    // TODO: ?? make field type as JSON
    return JSON.parse(item.value)
  }

  updateBookkeeper = (delegates) => {
    const value = JSON.stringify(delegates || this.getTopDelegates())
    const { create } = app.sdb.createOrLoad('Variable', { key: this.BOOK_KEEPER_NAME, value })
    if (!create) {
      app.sdb.update('Variable', { value }, { key: this.BOOK_KEEPER_NAME })
    }
  }

  shared = {
    getDelegate: (req, cb) => {
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
    
        return modules.delegates.getDelegates(query, (err2, delegates) => {
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
    },
    
    count: (req, cb) => (async () => {
      try {
        const count = app.sdb.getAll('Delegate').length
        return cb(null, { count })
      } catch (e) {
        this.library.logger.error('get delegate count error', e)
        return cb('Failed to count delegates')
      }
    })(),
    
    getVoters: (req, cb) => {
      const query = req.body
      library.scheme.validate(query, {
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
          return cb(err[0].message)
        }
    
        return (async () => {
          try {
            const votes = await app.sdb.findAll('Vote', { condition: { delegate: query.name } })
            if (!votes || !votes.length) return cb(null, { accounts: [] })
    
            const addresses = votes.map(v => v.address)
            const accounts = await app.sdb.findAll('Account', { condition: { address: { $in: addresses } } })
            const lastBlock = this.modules.blocks.getLastBlock()
            const totalSupply = this.blockStatus.calcSupply(lastBlock.height)
            for (const a of accounts) {
              a.balance = a.xas
              a.weightRatio = (a.weight * 100) / totalSupply
            }
            return cb(null, { accounts })
          } catch (e) {
            this.library.logger.error('Failed to find voters', e)
            return cb('Server error')
          }
        })()
      })
    },

    getDelegates: (req, cb) => {
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
  }
}