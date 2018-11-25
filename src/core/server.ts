export default class Server {
  private isLoaded = false;
  library: any;

  constructor(scope: any) {
    this.library = scope;
  }

  onBind(scope: any) {
    this.library= scope;
  }

  onBlockchainReady = () => {
    this.isLoaded = true;
  }

  cleanup() {
    this.isLoaded = false;
  }
}