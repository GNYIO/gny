export default class Server {
  private isLoaded = false;
  library: any;

  constructor(scope: any) {
    this.library = scope;
  }

  // Events
  onBind = (scope: any) => {
    this.library= scope;
  }

  onBlockchainReady = () => {
    this.isLoaded = true;
  }

  cleanup = (cb) => {
    this.library.logger.debug('Cleaning up core/server')
    this.isLoaded = false;
    cb()
  }
}