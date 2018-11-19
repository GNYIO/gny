import * as os from 'os';
import * as slots from '../utils/slots';

export default class System {
  private library: any;

  constructor(scope: any) {
    this.library = scope;
  }

  getOs() {
    return os.platform() + os.release()
  }

  getSystemInfo() {
    const lastBlock = this.library.blocks.getLastBlock();

    return {
      os: `${os.platform()}_${os.release()}`,
      version: this.library.config.version,
      timestamp: Date.now(),
      lastBlock: {
        height: lastBlock.height,
        timestamp: slots.getRealTime(lastBlock.timestamp),
        behind: slots.getNextSlot() - (slots.getSlotNumber(lastBlock.timestamp) + 1),
      },
    }
  }

  onBind(scope: any) {
    this.library = scope;
  }
}