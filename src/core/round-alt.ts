import slots = require('../utils/slots');

export class Round {
  library: any;
  modules: any;
  private isloaded: boolean = false;
  private feesByRound = {};
  private rewardsByRound = {};
  private delegatesByRound = {};
  private unFeesByRound = {};
  private unRewardsByRound = {};
  private unDelegatesByRound = {};

  constructor(scope: any) {
    this.library = scope;
  }

  loaded() {
    return this.isloaded;
  }

  calc(height: number) {
    return Math.floor(height / slots.delegates) + (height % slots.delegates > 0 ? 1 : 0);
  }

  onBind(scope: any) {
    this.modules = scope;
  }

  onBlockChainReady() {
    this.isloaded = true;
  }

  onFinishRound(round: any) {
    this.library.network.io.sockets.emit('/round/change', { number: round });
  }

  cleanup() {
    this.isloaded = false;
  }
}
