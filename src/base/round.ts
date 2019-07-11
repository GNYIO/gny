import slots from '../utils/slots';

export class RoundBase {
  public static calculateRound(height: number) {
    return (
      Math.floor(height / slots.delegates) +
      (height % slots.delegates > 0 ? 1 : 0)
    );
  }
}
