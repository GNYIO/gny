import slots from '../utils/slots';
import { IScope } from '../interfaces';

export default class Round {
  private readonly library: IScope;
  private isloaded: boolean = false;

  constructor(scope: IScope) {
    this.library = scope;
  }

  getLoadStatus() {
    return this.isloaded;
  }

  calculateRound(height: number) {
    return (
      Math.floor(height / slots.delegates) +
      (height % slots.delegates > 0 ? 1 : 0)
    );
  }

  // Events
  onBlockChainReady = () => {
    this.isloaded = true;
  };

  onFinishRound = (round: any) => {
    this.library.network.io.sockets.emit('/round/change', { number: round });
  };

  cleanup = cb => {
    this.library.logger.debug('Cleaning up core/round');
    this.isloaded = false;
    cb();
  };
}
