export default class Server {
  private isLoaded = false;
  private readonly library: any;

  constructor(scope: any) {
    this.library = scope;
  }

  // Events
    // Events
  onBlockchainReady = () => {
    this.isLoaded = true;
  }

  cleanup = (cb) => {
    this.library.logger.debug('Cleaning up core/server')
    this.isLoaded = false;
    cb()
  }
}