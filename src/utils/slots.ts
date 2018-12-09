import { EPOCH_TIME, INTERVAL, DELEGATES } from './constants';

export default class Slots {
  public delegates = DELEGATES;
  constructor() {}

  getEpochTime(time: number | undefined) {
    if (time === undefined) {
      time = Date.now();
    }
    return Math.floor((time - EPOCH_TIME.getTime()) / 1000);
  }

  getTime(time: number | undefined) {
    return this.getEpochTime(time)
  }

  getRealTime(epochTime) {
    if (epochTime === undefined) {
      epochTime = this.getTime(undefined);
    }

    const start = Math.floor(EPOCH_TIME.getTime() / 1000) * 1000;
    return start + epochTime * 1000;
  }

  getSlotNumber(epochTime?: number) {
    if (epochTime === undefined) {
      epochTime = this.getTime(undefined);
    }

    return Math.floor(epochTime / INTERVAL);
  }

  getSlotTime(slot: number) {
    return slot * INTERVAL;
  }

  getNextSlot() {
    return this.getSlotNumber(undefined) + 1;
  }

  getLastSlot(nextSlot: number) {
    return nextSlot + DELEGATES;
  }

  roundTime(date: Date) {
    return Math.floor(date.getTime() / 1000) * 1000;
  }
}
