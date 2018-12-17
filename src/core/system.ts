import * as os from 'os';
import slots from '../utils/slots';
import { IScope } from '../interfaces';

export default class System {
  private readonly library: IScope;

  constructor(scope: IScope) {
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
}