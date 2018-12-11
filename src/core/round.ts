import * as slots from '../utils/slots';

export default class Round {
  private library: any;
  private isloaded: boolean = false;

  constructor(scope: any) {
    this.library = scope;
  }

  getLoadStatus() {
    return this.isloaded;
  }

  calculateRound(height: number) {
    return Math.floor(height / slots.delegates) + (height % slots.delegates > 0 ? 1 : 0);
  }

  onBind(scope: any) {
    this.library = scope;
  }

  onBlockChainReady = () => {
    this.isloaded = true;
  }

  onFinishRound(round: any) {
    this.library.network.io.sockets.emit('/round/change', { number: round });
  }

  cleanup() {
    console.log('round.ts cleanup')
    this.isloaded = false;
  }
}