import * as crypto from 'crypto';
import * as ed from '../utils/ed'
import Slots from '../utils/slots';
import addressHelper from '../utils/address'
import BlockReward from '../utils/block-reward'
import { Modules, IScope } from '../interfaces';

const slots = new Slots()

export default class Delegates {
  private loaded: boolean = false;
  private keyPairs: any = {};
  private isForgingEnabled = true;
  private readonly library: IScope;
  private modules: Modules;

  private readonly BOOK_KEEPER_NAME = 'round_bookkeeper'
  private blockreward = new BlockReward();

  constructor(scope: IScope) {
    this.library = scope;
  }

  public isPublicKeyInKeyPairs = (publicKey: string) => {
    if (this.keyPairs[publicKey]) {
      return true;
    } else {
      return false;
    }
  }

  public setKeyPair = (publicKey: string, keys: { privateKey: any, publicKey: any }) => {
    this.keyPairs[publicKey] = keys;
  }
  public removeKeyPair = (publicKey: string) => {
    delete this.keyPairs[publicKey];
  }

  private getBlockSlotData = (slot: any, height: any) : { time: number, keypair: any } => {
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

  public loop = () => {
    if (!this.isForgingEnabled) {
      this.library.logger.trace('Loop:', 'forging disabled')
      return null
    }
    if (!Object.keys(this.keyPairs).length) {
      this.library.logger.trace('Loop:', 'no delegates')
      return null
    }

    if (!this.loaded || this.modules.loader.syncing()) {
      this.library.logger.trace('Loop:', 'node not ready')
      return null
    }

    const currentSlot = slots.getSlotNumber()
    const lastBlock = this.modules.blocks.getLastBlock()

    if (currentSlot === slots.getSlotNumber(lastBlock.timestamp)) {
      return null
    }

    if (Date.now() % 10000 > 5000) {
      this.library.logger.trace('Loop:', 'maybe too late to collect votes')
      return null
    }

    let currentBlockData = this.getBlockSlotData(currentSlot, lastBlock.height + 1)
    if (!currentBlockData) {
      this.library.logger.trace('Loop:', 'skipping slot')
      return null
    }

    // this.library.sequence.add(done => (async () => { }))
    (async () => {
        try {
        if (slots.getSlotNumber(currentBlockData.time) === slots.getSlotNumber()
          && this.modules.blocks.getLastBlock().timestamp < currentBlockData.time) {
          await this.modules.blocks.generateBlock(currentBlockData.keypair, currentBlockData.time)
        }
      } catch (e) {
        this.library.logger.error('Failed generate block within slot:', e)
        return null
      }
    })();
  }

  private loadMyDelegates = () : void | Error => {
    let secrets = []
    if (this.library.config.forging.secret) {
      secrets = Array.isArray(this.library.config.forging.secret)
        ? this.library.config.forging.secret : [this.library.config.forging.secret]
    }
  
    try {
      const delegates = global.app.sdb.getAll('Delegate')
      if (!delegates || !delegates.length) {
        return 'Delegates not found in db'
      }
      const delegateMap = new Map()
      for (const d of delegates) {
        delegateMap.set(d.publicKey, d)
      }
      for (const secret of secrets) {
        const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(secret, 'utf8').digest())
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

  public getActiveDelegateKeypairs = (height) => {
    let delegates = this.generateDelegateList(height)
    if (!delegates) {
      return null
    }

    const results = []
    for (const key in this.keyPairs) {
      if (delegates.indexOf(key) !== -1) {
        results.push(this.keyPairs[key])
      }
    }
    return results
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
      const seedSource = this.modules.round.calculateRound(height).toString()
  
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
      global.app.logger.error('error while generating DelgateList', e);
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
  
  public validateBlockSlot = (block): void => {
    const activeDelegates = this.generateDelegateList(block.height);

    const currentSlot = slots.getSlotNumber(block.timestamp)
    const delegateKey = activeDelegates[currentSlot % 101]
  
    if (delegateKey && block.delegate === delegateKey) {
      return
    }
  
    throw new Error(`Failed to verify slot, expected delegate: ${delegateKey}`);
  }
  
  // fixme ?? : get method should not modify anything....
  public getDelegates = (query, cb) => {
    let delegates = global.app.sdb.getAll('Delegate').map(d => Object.assign({}, d))
    if (!delegates || !delegates.length) return cb('No delegates')
  
    delegates = delegates.sort(this.compare)
  
    const lastBlock = this.modules.blocks.getLastBlock()
    const totalSupply = this.blockreward.calculateSupply(lastBlock.height)
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
      global.app.sdb.update('Delegate', delegates[i], { address: delegates[i].address })
    }
    return cb(null, delegates)
  }

  enableForging = () => {
    this.isForgingEnabled = true
  }
  
  disableForging = () => {
    this.isForgingEnabled = false
  }

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope
  }

  public onBlockchainReady = () => {
    this.loaded = true

    let error = this.loadMyDelegates()
    if (error) {
      this.library.logger.error('Failed to load delegates', error)
    }

    let nextLoop = () => {

      let result = this.loop()
      setTimeout(nextLoop, 100)
    }

    setImmediate(nextLoop)
  }

  public compare = (l, r) => {
    if (l.votes !== r.votes) {
      return r.votes - l.votes
    }
    return l.publicKey < r.publicKey ? 1 : -1
  }

  cleanup = (cb) => {
    this.library.logger.debug('Cleaning up core/delegates')
    this.loaded = false
    cb()
  }

  getTopDelegates = () => {
    const allDelegates = global.app.sdb.getAll('Delegate')
    return allDelegates.sort(this.compare).map(d => d.publicKey).slice(0, 101)
  }

  getBookkeeperAddresses = () => {
    const bookkeeper = this.getBookkeeper()
    const addresses = new Set()
    for (const i of bookkeeper) {
      const address = addressHelper.generateAddress(i)
      addresses.add(address)
    }
    return addresses
  }

  getBookkeeper = () => {
    const item = global.app.sdb.get('Variable', this.BOOK_KEEPER_NAME)
    if (!item) throw new Error('Bookkeeper variable not found')

    // TODO: ?? make field type as JSON
    return JSON.parse(item.value)
  }

  updateBookkeeper = (delegates?) => {
    const value = JSON.stringify(delegates || this.getTopDelegates())
    const { create } = global.app.sdb.createOrLoad('Variable', { key: this.BOOK_KEEPER_NAME, value })
    if (!create) {
      global.app.sdb.update('Variable', { value }, { key: this.BOOK_KEEPER_NAME })
    }
  }

}