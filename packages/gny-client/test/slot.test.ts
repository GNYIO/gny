import 'jest-extended';

describe('slots.js', () => {
  const slots = require('../lib/time/slots');

  it('should be object', () => {
    expect(slots).toBeObject();
  });

  it('should have properties', () => {
    const properties = [
      'interval',
      'delegates',
      'getTime',
      'getRealTime',
      'getSlotNumber',
      'getSlotTime',
      'getNextSlot',
      'getLastSlot',
    ];
    properties.forEach(function(property) {
      expect(slots).toHaveProperty(property);
    });
  });

  describe('.interval', () => {
    const interval = slots.interval;

    it('should be number and not NaN', () => {
      expect(interval).toBeNumber();
      expect(interval).not.toBeNull();
    });
  });

  describe('.delegates', () => {
    const delegates = slots.delegates;

    it('should be number and not NaN', () => {
      expect(delegates).toBeNumber();
      expect(delegates).not.toBeNull();
    });
  });

  describe('#getTime', () => {
    const getTime = slots.getTime;

    it('should be a function', () => {
      expect(getTime).toBeFunction();
    });

    it('should return epoch time as number, equal to 27251200', () => {
      const d = 1569822400000;
      const time = getTime(d);

      expect(time).toBeNumber();
      expect(time).toEqual(27251200);
    });
  });

  describe('#getRealTime', () => {
    const getRealTime = slots.getRealTime;

    it('should be a function', () => {
      expect(getRealTime).toBeFunction();
    });

    it('should return return real time, convert 196144 to 1542767344000', () => {
      const d = 196144;
      const real = getRealTime(d);

      expect(real).toBeNumber();
      expect(real).toEqual(1542767344000);
    });
  });

  describe('#getSlotNumber', () => {
    const getSlotNumber = slots.getSlotNumber;

    it('should be a function', () => {
      expect(getSlotNumber).toBeFunction();
    });

    it('should return slot number, equal to 19614', () => {
      const d = 196144;
      const slot = getSlotNumber(d);

      expect(slot).toBeNumber();
      expect(slot).toEqual(19614);
    });
  });

  describe('#getSlotTime', () => {
    const getSlotTime = slots.getSlotTime;

    it('should be function', () => {
      expect(getSlotTime).toBeFunction();
    });

    it('should return slot time number, equal to 196140', () => {
      const slot = 19614;
      const slotTime = getSlotTime(19614);
      expect(slotTime).toBeNumber();
      expect(slotTime).toEqual(196140);
    });
  });

  describe('#getNextSlot', () => {
    const getNextSlot = slots.getNextSlot;

    it('should be function', () => {
      expect(getNextSlot).toBeFunction();
    });

    it('should return next slot number', () => {
      const nextSlot = getNextSlot();
      expect(nextSlot).toBeNumber();
      expect(nextSlot).not.toBeNull();
    });
  });

  describe('#getLastSlot', () => {
    const getLastSlot = slots.getLastSlot;

    it('should be function', () => {
      expect(getLastSlot).toBeFunction();
    });

    it('should return last slot number', () => {
      const lastSlot = getLastSlot(slots.getNextSlot());
      expect(lastSlot).toBeNumber();
      expect(lastSlot).not.toBeNull();
    });
  });
});
