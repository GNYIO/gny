import { EPOCH_TIME, INTERVAL, DELEGATES } from './constants.js';

class Slots {
  public delegates = DELEGATES;
  constructor() {}

  getEpochTime = (time?: number) => {
    if (time === undefined) {
      time = Date.now();
    }
    return Math.floor((time - EPOCH_TIME.getTime()) / 1000);
  };

  getRealTime = (epochTime?: number) => {
    if (epochTime === undefined) {
      epochTime = this.getEpochTime(undefined);
    }

    const start = Math.floor(EPOCH_TIME.getTime() / 1000) * 1000;
    return start + epochTime * 1000;
  };

  getSlotNumber = (epochTime?: number) => {
    if (epochTime === undefined) {
      epochTime = this.getEpochTime();
    }

    return Math.floor(epochTime / INTERVAL);
  };

  getSlotTime = (slot: number) => {
    return slot * INTERVAL;
  };

  getNextSlot = () => {
    return this.getSlotNumber(undefined) + 1;
  };

  getLastSlot = (nextSlot: number) => {
    return nextSlot + DELEGATES;
  };

  roundTime(date: Date) {
    return Math.floor(date.getTime() / 1000) * 1000;
  }
}

export const slots = new Slots();
