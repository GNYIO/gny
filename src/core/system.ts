import * as os from 'os';

export default class System {
  constructor() {
  }

  getOS() {
    return os.platform() + os.release();
  }

  getVersion() {
    return global.Config.version;
  }

  getPort() {
    return global.Config.port;
  }

  getMagic() {
    return global.Config.magic;
  }
}