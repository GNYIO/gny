import * as os from 'os';
import Slots from '../utils/slots';
const slots = new Slots()

export default class System {
  private library: any;

  constructor(scope: any) {
    this.library = scope;
  }

  getOS() {
    return os.platform() + os.release()
  }

  getVersion() {
    return global.Config.version;
  }

  getPort() {
    return global.Config.port
  }

  getMagic() {
    return global.Config.magic
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

  onBind = (scope: any) => {
    this.library = scope;
  }
}