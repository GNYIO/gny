import crypto = require('crypto');
import { isArray } from 'util';
import * as ed from '../utils/ed.js';
import Router from '../utils/router';
import LimitCache from '../utils/limit-cache';
import addressHelper = require('../utils/address');
import transactionMode from '../utils/transaction-mode';

const priv = {}

priv.unconfirmedNumber = 0
priv.unconfirmedTransactions = []
priv.unconfirmedTransactionsIdIndex = {}

class TransactionPool {
  constructor() {
    this.index = new Map()
    this.unConfirmed = []
  }

  add(trs) {
    this.unConfirmed.push(trs)
    this.index.set(trs.id, this.unConfirmed.length - 1)
  }

  remove(id) {
    const pos = this.index.get(id)
    delete this.index[id]
    this.unConfirmed[pos] = null
  }

  has(id) {
    const pos = this.index.get(id)
    return pos !== undefined && !!this.unConfirmed[pos]
  }

  getUnconfirmed() {
    const a = []

    for (let i = 0; i < this.unConfirmed.length; i++) {
      if (this.unConfirmed[i]) {
        a.push(this.unConfirmed[i])
      }
    }
    return a
  }

  clear() {
    this.index = new Map()
    this.unConfirmed = []
  }

  get(id) {
    const pos = this.index.get(id)
    return this.unConfirmed[pos]
  }
}

// Constructor
class Transactions {
  private readonly library: any;
  modules: any;
  genesisBlock: any;
  pool: TransactionPool;
  failedTrsCache: LimitCache;

  constructor(scope: any) {
    this.library = scope;
    this.genesisBlock = this.library.genesisBlock
    this.pool = new TransactionPool();
    this.failedTrsCache = new LimitCache()

    this.attachApi();
    // setImmediate(cb, null, self)
  }


  // Private methods
  private attachApi = () => {
    const router1 = new Router()
    const router = router1.router

    router.use((req, res, next) => {
      if (this.modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' })
    })

    router.map(this.shared, {
      'get /': 'getTransactions',
      'get /get': 'getTransaction',
      'get /unconfirmed/get': 'getUnconfirmedTransaction',
      'get /unconfirmed': 'getUnconfirmedTransactions',
      'put /': 'addTransactionUnsigned',
      'put /batch': 'addTransactions',
    })

    router.use((req: any, res: any) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' })
    })

    this.library.network.app.use('/api/transactions', router)
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err.toString())
      return res.status(500).send({ success: false, error: err.toString() })
    })

    this.attachStorageApi()
  }

  private attachStorageApi = () => {
    const router1 = new Router();
    const router = router1.router;

    router.use((req, res, next) => {
      if (this.modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' })
    })

    router.map(this.shared, {
      'get /get': 'getStorage',
      'get /:id': 'getStorage',
      'put /': 'putStorage',
    })

    router.use((req, res) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' })
    })

    this.library.network.app.use('/api/storages', router)
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err.toString())
      return res.status(500).send({ success: false, error: err.toString() })
    })
  }

  getUnconfirmedTransaction = (id: string) => this.pool.get(id)

  getUnconfirmedTransactionList = () => this.pool.getUnconfirmed()

  removeUnconfirmedTransaction = (id: string) => this.pool.remove(id)

  hasUnconfirmed = (id: string) => this.pool.has(id)

  clearUnconfirmed = () => this.pool.clear()

  getUnconfirmedTransactions = (cb) => setImmediate(
    cb, null,
    { transactions: this.getUnconfirmedTransactionList() },
  )

  getTransactions = (req, cb) => {
    const query = req.body
    const limit = query.limit ? Number(query.limit) : 100
    const offset = query.offset ? Number(query.offset) : 0
    const condition = {}
    if (query.senderId) {
      condition.senderId = query.senderId
    }
    if (query.type) {
      condition.type = Number(query.type)
    }

    (async () => {
      try {
        const count = await app.sdb.count('Transaction', condition)
        let transactions = await app.sdb.find('Transaction', condition, { limit, offset })
        if (!transactions) transactions = []
        return cb(null, { transactions, count })
      } catch (e) {
        app.logger.error('Failed to get transactions', e)
        return cb(`System error: ${e}`)
      }
    })()
  }

  getTransaction = (req, cb) => {
    (async () => {
      try {
        if (!req.params || !req.params.id) return cb('Invalid transaction id')
        const id = req.params.id
        const trs = await app.sdb.find('Transaction', { id })
        if (!trs || !trs.length) return cb('Transaction not found')
        return cb(null, { transaction: trs[0] })
      } catch (e) {
        return cb(`System error: ${e}`)
      }
    })()
  }

  applyTransactionsAsync = async (transactions) => {
    for (let i = 0; i < transactions.length; ++i) {
      await this.applyUnconfirmedTransactionAsync(transactions[i])
    }
  }

  processUnconfirmedTransactions = (transactions, cb) => {
    (async () => {
      try {
        for (const transaction of transactions) {
          await this.processUnconfirmedTransactionAsync(transaction)
        }
        cb(null, transactions)
      } catch (e) {
        cb(e.toString(), transactions)
      }
    })()
  }

  processUnconfirmedTransactionsAsync = async (transactions) => {
    for (const transaction of transactions) {
      await this.processUnconfirmedTransactionAsync(transaction)
    }
  }

  processUnconfirmedTransaction = (transaction, cb) => {
    (async () => {
      try {
        await this.processUnconfirmedTransactionAsync(transaction)
        cb(null, transaction)
      } catch (e) {
        cb(e.toString(), transaction)
      }
    })()
  }

  processUnconfirmedTransactionAsync = async (transaction) => {
    try {
      if (!transaction.id) {
        transaction.id = this.library.base.transaction.getId(transaction)
      } else {
        const id = this.library.base.transaction.getId(transaction)
        if (transaction.id !== id) {
          throw new Error('Invalid transaction id')
        }
      }

      if (this.modules.blocks.isCollectingVotes()) {
        throw new Error('Block consensus in processing')
      }

      if (this.failedTrsCache.has(transaction.id)) {
        throw new Error('Transaction already processed')
      }
      if (this.pool.has(transaction.id)) {
        throw new Error('Transaction already in the pool')
      }
      const exists = await app.sdb.exists('Transaction', { id: transaction.id })
      if (exists) {
        throw new Error('Transaction already confirmed')
      }
      await this.applyUnconfirmedTransactionAsync(transaction)
      this.pool.add(transaction)
      return transaction
    } catch (e) {
      this.failedTrsCache.set(transaction.id, true)
      throw e
    }
  }

  applyUnconfirmedTransactionAsync = async (transaction) => {
    this.library.logger.debug('apply unconfirmed trs', transaction)

    const height = this.modules.blocks.getLastBlock().height
    const block = {
      height: height + 1,
    }

    const senderId = transaction.senderId
    const requestorId = transaction.requestorId
    if (!senderId) {
      throw new Error('Missing sender address')
    }

    const mode = transaction.mode
    if (transactionMode.isRequestMode(mode)) {
      if (!requestorId) throw new Error('No requestor provided')
      if (requestorId === senderId) throw new Error('Sender should not be equal to requestor')
      if (!transaction.senderPublicKey) throw new Error('Requestor public key not provided')
    } else if (transactionMode.isDirectMode(mode)) {
      if (requestorId) throw new Error('RequestId should not be provided')
      // HARDCODE_HOT_FIX_BLOCK_6119128
      // if (height > 6119128 &&
      //     app.util.address.isAddress(senderId) &&
      //     !transaction.senderPublicKey) {
      if (app.util.address.isAddress(senderId)
        && !transaction.senderPublicKey) {
        throw new Error('Sender public key not provided')
      }
    } else {
      throw new Error('Unexpected transaction mode')
    }

    let requestor = null
    let sender = await app.sdb.load('Account', senderId)
    if (!sender) {
      if (height > 0) throw new Error('Sender account not found')
      sender = app.sdb.create('Account', {
        address: senderId,
        name: null,
        gny: 0,
      })
    }

    if (requestorId) {
      if (!app.util.address.isAddress(requestorId)) {
        throw new Error('Invalid requestor address')
      }

      requestor = await app.sdb.load('Account', requestorId)
      if (!requestor) {
        throw new Error('Requestor account not found')
      }
    } else {
      requestor = sender
    }

    if (transaction.senderPublicKey) {
      const signerId = transaction.requestorId || transaction.senderId
      let generatedAddress = addressHelper.generateAddress(transaction.senderPublicKey)
      if (generatedAddress !== signerId) {
        throw new Error('Invalid senderPublicKey')
      }
    }

    const context = {
      trs: transaction,
      block,
      sender,
      requestor,
    }
    if (height > 0) {
      const error = await this.library.base.transaction.verify(context)
      if (error) throw new Error(error)
    }

    try {
      app.sdb.beginContract()
      await this.library.base.transaction.apply(context)
      app.sdb.commitContract()
    } catch (e) {
      app.sdb.rollbackContract()
      this.library.logger.error(e)
      throw e
    }
  }

  toAPIV1Transactions = (transArray, block) => {
    if (transArray && isArray(transArray) && transArray.length > 0) {
      return transArray.map(t => this.toAPIV1Transaction(t, block))
    }
    return []
  }

  tranfersToAPIV1Transactions = async (transferArray, block) => {
    if (transferArray && isArray(transferArray) && transferArray.length > 0) {

      let transMap = new Map()
      let transIds = transferArray.map(t => t.tid)
      let transArray = await app.sdb.find('Transaction', { id: { $in: transIds } })
      transArray.forEach((t: any) => transMap.set(t.id, t))

      transferArray.forEach(transfer => {
        const trans = transMap.get(transfer.tid)
        if (trans !== undefined) {
          transfer.senderPublicKey = trans.senderPublicKey
          transfer.signSignature = trans.secondSignature || trans.signSignature
          transfer.message = trans.message
          transfer.fee = trans.fee
          transfer.type = trans.type
          transfer.args = trans.args
          transfer.signatures = trans.signatures
        }
      })

      return transferArray.map(t => this.toAPIV1Transaction(t, block))
    }
    return []
  }


  private toV1TypeAndArgs(type, args) {
    let v1Type

    const v1Args = {}
    let result = {}
    switch (type) {
      case 1: // transfer
        v1Type = 0
        result = { amount: Number(args[0]), recipientId: args[1] }
        break
      case 3: // setPassword
        v1Type = 1
        result = { senderPublicKey: args[0] }
        break
      case 10: // registerDelegate
        v1Type = 2
        break
      case 11: // vote
        v1Type = 3
        reulst = { votes: args.map(v => `+${v}`).join(',') }
        break
      case 12: // unvote
        v1Type = 3
        reulst = { votes: args.map(v => `-${v}`).join(',') }
        break
      case 200: // register dapp
        v1Type = 5
        // args = [ dapp.name, dapp.description, dapp.link,
        // dapp.icon, dapp.delegates, dapp.unlockDelegates ]
        break
      case 204: // deposit
        v1Type = 6
        // args = [ it.name, it.currency, it.amount ];
        break
      case 205: // withdrawal
        v1Type = 7
        // args = [ ot.name, tx.senderId, ot.currency, ot.amount, ot.outtransactionId, 1 ]
        break
      case 100: // registerIssuer
        v1Type = 9
        // args = [ issuers.name, issuers.desc ];
        break
      case 101: // registerAsset
        v1Type = 10
        // args = [ asset.name, asset.desc, asset.maximum, asset.precision ]
        break
      case 102: // issue
        v1Type = 13
        // args = [ issue.currency, issue.amount ];
        break
      case 103: // UIA transfer
        v1Type = 14
        result = {
          asset: { uiaTransfer: { currency: args[0], amount: String(args[1]) } },
          recipientId: args[2],
        }
        break
      case 4:
        v1Type = 100 // lock
        // args = [ tx.args[0], balance ];
        break
    }

    result.recipientId = result.recipientId || ''
    return Object.assign(result, { type: v1Type, args: v1Args, argsNew: args })
  }

  toAPIV1Transaction = (trans, block) => {
    if (!trans) return trans

    const signArray = trans.signatures
    const resultTrans = {
      id: trans.tid,
      height: trans.height,
      timestamp: trans.timestamp,
      senderPublicKey: trans.senderPublicKey,
      senderId: trans.senderId,
      signSignature: trans.signSignature,
      message: trans.message,
      fee: trans.fee,
      blockId: block ? block.id : undefined,
      recipientId: '',
      amount: 0,
      asset: {},
      confirmations: this.modules.blocks.getLastBlock().height - trans.height,

      type: -1,
      signature: signArray.length === 1 ? signArray[0] : null,
      signatures: signArray.length === 1 ? null : signArray,
      args: {},
    }
    return Object.assign(resultTrans, this.toV1TypeAndArgs(trans.type, trans.args))
  }


  addTransactionUnsigned = (transaction, cb) => {
    this.shared.addTransactionUnsigned({ body: transaction }, cb)
  }

  list = (query, cb) => this.list(query, cb)

  getById = (id, cb) => this.getById(id, cb)

  // Events
  onBind = (scope) => {
    this.modules = scope
  }

  getTransactionsForV1 = (req, cb) => {
    return this.shared.getTransactions(req, cb)
  }

  // Shared
  /**
   * for exchanges only
   * get transfers by given conditions
   *
   */
  shared = {
    getTransactions: (req, cb) => {
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
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          blockId: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
        },
      }, (err) => {
        if (err) {
          return cb(err[0].message)
        }

        const limit = query.limit || 100
        const offset = query.offset || 0

        const condition = {}
        if (query.senderId) {
          condition.senderId = query.senderId
        }
        if (query.type !== undefined) {
          const type = Number(query.type)
          if (type !== 0 && type !== 14) return cb('invalid transaction type')

          condition.currency = type === 0 ? 'GNY' : { $ne: 'GNY' }
        }
        if (query.id) {
          condition.tid = query.id
        }

        (async () => {
          try {
            let block
            if (query.blockId) {
              block = await app.sdb.getBlockById(query.blockId)
              if (block === undefined) {
                return cb(null, { transactions: [], count: 0 })
              }
              condition.height = block.height
            }
            const count = await app.sdb.count('Transfer', condition)
            let transfer = await app.sdb.find('Transfer', condition, query.unlimited ? {} : { limit, offset })
            if (!transfer) transfer = []
            block = this.modules.blocks.toAPIV1Block(block)
            const transactions = await this.tranfersToAPIV1Transactions(transfer, block)
            return cb(null, { transactions, count })
          } catch (e) {
            app.logger.error('Failed to get transactions', e)
            return cb(`System error: ${e}`)
          }
        })()
        return null
      })
    },

    getTransaction: (req, cb) => {
      const query = req.body
      this.library.scheme.validate(query, {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
        },
        required: ['id'],
      }, (err) => {
        if (err) {
          return cb(err[0].message)
        }
        const callback = (err2, ret) => (async () => {
          if (err2) return cb(err2)

          if (!ret || !ret.transactions || ret.transactions.length < 1) {
            cb('transaction not found', ret)
          } else {
            // for exchanges ....
            let transaction = ret.transactions[0]
            transaction.height = String(transaction.height)
            transaction.confirmations = String(transaction.confirmations)

            cb(null, { transaction })
          }
        })()
        return this.shared.getTransactions(req, callback)
      })
    },

    getUnconfirmedTransaction: (req, cb) => {
      const query = req.body
      this.library.scheme.validate(query, {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 64,
          },
        },
        required: ['id'],
      }, (err) => {
        if (err) {
          return cb(err[0].message)
        }

        const unconfirmedTransaction = self.getUnconfirmedTransaction(query.id)

        return !unconfirmedTransaction
          ? cb('Transaction not found')
          : cb(null, { transaction: unconfirmedTransaction })
      })
    },

    getUnconfirmedTransactions: (req, cb) => {
      const query = req.body
      this.library.scheme.validate(query, {
        type: 'object',
        properties: {
          senderPublicKey: {
            type: 'string',
            format: 'publicKey',
          },
          address: {
            type: 'string',
          },
        },
      }, (err) => {
        if (err) {
          return cb(err[0].message)
        }

        const transactions = self.getUnconfirmedTransactionList(true)
        const toSend: any[] = []

        if (query.senderPublicKey || query.address) {
          for (let i = 0; i < transactions.length; i++) {
            if (transactions[i].senderPublicKey === query.senderPublicKey
              || transactions[i].recipientId === query.address) {
              toSend.push(transactions[i])
            }
          }
        } else {
          transactions.forEach(t => toSend.push(t))
        }

        return cb(null, { transactions: toSend })
      })
    },

    addTransactionUnsigned: (req, cb) => {
      const query = req.body
      if (query.type !== undefined) {
        query.type = Number(query.type)
        this.convertV1Transfer(query)
      }
      const valid = this.library.scheme.validate(query, {
        type: 'object',
        properties: {
          secret: { type: 'string', maxLength: 100 },
          fee: { type: 'integer', min: 1 },
          type: { type: 'integer', min: 1 },
          args: { type: 'array' },
          message: { type: 'string', maxLength: 50 },
          senderId: { type: 'string', maxLength: 50 },
          mode: { type: 'integer', min: 0, max: 1 },
        },
        required: ['secret', 'fee', 'type'],
      })
      if (!valid) {
        this.library.logger.warn('Failed to validate query params', this.library.scheme.getLastError())
        return setImmediate(cb, this.library.scheme.getLastError().details[0].message)
      }

      this.library.sequence.add((callback) => {
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
              fee: query.fee,
              type: query.type,
              senderId: query.senderId || null,
              args: query.args || null,
              message: query.message || null,
              secondKeypair,
              keypair,
              mode: query.mode,
            })
            await this.processUnconfirmedTransactionAsync(trs)
            this.library.bus.message('unconfirmedTransaction', trs)
            callback(null, { transactionId: trs.id })
          } catch (e) {
            this.library.logger.warn('Failed to process unsigned transaction', e)
            callback(e.toString())
          }
        })()
      }, cb)
    },

    addTransactions: (req, cb) => {
      if (!req.body || !req.body.transactions) {
        return cb('Invalid params')
      }
      const trs = req.body.transactions
      try {
        for (const t of trs) {
          this.library.base.transaction.objectNormalize(t)
        }
      } catch (e) {
        return cb(`Invalid transaction body: ${e.toString()}`)
      }
      return this.library.sequence.add((callback) => {
        this.processUnconfirmedTransactions(trs, callback)
      }, cb)
    }
  }

  convertV1Transfer(trans) {
    if (trans.type === 0 && trans.amount !== undefined && trans.recipientId !== undefined) {
      trans.type = 1
      trans.args = [trans.amount, trans.recipientId]
      Reflect.deleteProperty(trans, 'amount')
      Reflect.deleteProperty(trans, 'recipientId')
    }
  }

}


// Export
export default Transactions;
