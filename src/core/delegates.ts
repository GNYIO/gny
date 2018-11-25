import * as crypto from 'crypto';
import * as util from 'util';
import BlockStatus from '../utils/block-status';
import * as addressUtils from '../utils/address';
import * as slots from '../utils/slots';
import * as ed from '../utils/ed'
import addressHelper from '../utils/address.js'

export default class Delegate {
  private isLoaded: boolean = false;
  private blockStatus = new BlockStatus();
  private isForgingEnabled: boolean = true;
  private keyPairs: any = {};
  private library: any;
  private modules: any;
  private readonly BOOK_KEEPER_NAME = 'round_bookkeeper'

  constructor(scope: any) {
    this.library = scope;

    // this.attachApi();
  }

  public compare = (l, r) => {
    if (l.votes !== r.votes) {
      return r.votes - l.votes
    }
    return l.publicKey < r.publicKey ? 1 : -1
  }
  

  public getTopDelegates = () => {
    const allDelegates = app.sdb.getAll('Delegate')
    return allDelegates.sort(this.compare).map(d => d.publicKey).slice(0, 101)
  }

  public updateBookkeeper = (delegates) => {
    const value = JSON.stringify(delegates || this.getTopDelegates())
    const { create } = app.sdb.createOrLoad('Variable', { key: this.BOOK_KEEPER_NAME, value })
    if (!create) {
      app.sdb.update('Variable', { value }, { key: this.BOOK_KEEPER_NAME })
    }
  }
  

  public onBlockchainReady = async () => {
    this.isLoaded = true

    const nextLoop = async () => {
  
      await this.loop()
      setTimeout(nextLoop, 100)
    }

    await this.loadMyDelegates()
    await nextLoop()
  }

  private loadMyDelegates = async () => {
    debugger
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

  private async loop() {
    if (!this.isForgingEnabled) {
      this.library.logger.trace('Loop: forging disabled');
      return;
    }

    if (!Object.keys(this.keyPairs).length) {
      this.library.logger.trace('Loop: no delegate is configured');
      return;
    }

    debugger
    if (!this.isLoaded || this.modules.loader.isSynced) {
      this.library.logger.trace('Loop: node is not ready');
      return;
    }

    const currentSlot = slots.getSlotNumber();
    const lastBlock = this.modules.blocks.getLastBlock();

    if (currentSlot === slots.getSlotNumber(lastBlock.timestamp)) {
      return;
    }

    if (Date.now() % 10000 > 5000) {
      this.library.logger.trace('Loop: too late to collect votes')
      return;
    }

    const currentBlockData = await this.getBlockSlotData(currentSlot, lastBlock.height + 1)
    
    if (!currentBlockData) {
      return
    }

  }

  public getBookkeeper = () => {
    const item = app.sdb.get('Variable', this.BOOK_KEEPER_NAME)
    if (!item) throw new Error('Bookkeeper variable not found')
  
    // TODO: ?? make field type as JSON
    return JSON.parse(item.value)
  }

  public getBookkeeperAddresses = () => {
    const bookkeeper = this.getBookkeeper()
    const addresses = new Set()
    for (const i of bookkeeper) {
      const address = addressHelper.generateNormalAddress(i)
      addresses.add(address)
    }
    return addresses
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

  // Events
  public onBind = (scope: any) => {
    this.modules = scope
  }
}