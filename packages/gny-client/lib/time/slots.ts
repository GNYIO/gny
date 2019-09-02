export function getEpochTime(time: any) {
  if (time === undefined) {
    time = new Date().getTime();
  }
  const d = beginEpochTime();
  const t = d.getTime();
  return Math.floor((time - t) / 1000);
}

export function beginEpochTime() {
  const d = new Date(Date.UTC(2018, 10, 18, 20, 0, 0, 0));

  return d;
}

const interval = 10;
const delegates = 101;

export function getTime(time?: any) {
  return getEpochTime(time);
}

export function getRealTime(epochTime: any) {
  if (epochTime === undefined) {
    epochTime = getTime();
  }
  const d = beginEpochTime();
  const t = Math.floor(d.getTime() / 1000) * 1000;
  return t + epochTime * 1000;
}

export function getSlotNumber(epochTime?: any) {
  if (epochTime === undefined) {
    epochTime = getTime();
  }

  return Math.floor(epochTime / interval);
}

export function getSlotTime(slot: number) {
  return slot * interval;
}

export function getNextSlot() {
  const slot = getSlotNumber();

  return slot + 1;
}

export function getLastSlot(nextSlot: number) {
  return nextSlot + delegates;
}
