import * as crypto from 'crypto';
import * as util from 'util';
import * as BlockStatus from '../utils/block-status';
import * as addressUtils from '../utils/address';
import * as slots from '../utils/slots';

export default class Delegate {
  private isLoaded: boolean = false;
  private blockStatus = new BlockStatus();
  private isForgingEnabled: boolean = true;
  private keyPairs: any = {};
  private library: any;

  constructor(scope: any) {
    this.library = scope;
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

    if (!this.isLoaded || this.modules.loader.isSyncing()) {
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

  }
}