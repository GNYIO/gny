import slots from '../../../src/utils/slots';
import { EPOCH_TIME, INTERVAL, DELEGATES } from '../../../src/utils/constants';

const lolex = require('lolex');
// jest.mock('../../../src/utils/slots');

describe('slots', () => {
  it('should be object', () => {
    expect(typeof slots).toBe('object');
  });

  it('should have properties', () => {
    const properties = [
      'delegates',
      'getEpochTime',
      'getTime',
      'getRealTime',
      'getSlotNumber',
      'getSlotTime',
      'getNextSlot',
      'getLastSlot',
      'roundTime',
    ];
    properties.forEach(function(property) {
      expect(slots).toHaveProperty(property);
    });
  });

  describe('interval', () => {
    const interval = INTERVAL;

    it('should be number and not NaN', () => {
      expect(typeof interval).toBe('number');
      expect(interval).not.toBeNull();
    });
  });

  describe('.delegates', () => {
    const delegates = slots.delegates;

    it('should be number and not NaN', () => {
      expect(typeof delegates).toBe('number');
      expect(delegates).not.toBeNull();
    });
  });

  describe('#getTime', () => {
    const getTime = slots.getTime;

    it('should be a function', () => {
      expect(typeof getTime).toBe('function');
    });

    it('should return epoch time as number, equal to 4410100', () => {
      const d = 1546981300000;

      const time = getTime(d);

      expect(typeof time).toBe('number');
      expect(time).toEqual(4410100);
    });

    it('should return time based on now time, equal to 3700800', () => {
      const date = new Date('2019-1-1');
      const clock = lolex.install({ now: date });
      const d = undefined;

      const time = getTime(d);
      expect(typeof time).toBe('number');
      expect(time).toEqual(3700800);
      clock.uninstall();
    });
  });

  describe('#getRealTime', () => {
    const getRealTime = slots.getRealTime;

    it('should be a function', () => {
      // getRealTime.should.be.type('function');
      expect(typeof getRealTime).toBe('function');
    });

    it('should return real time, convert 196144 to 1542767344000', () => {
      const d = 196144;
      const real = getRealTime(d);
      expect(typeof real).toBe('number');
      expect(real).toEqual(1542767344000);
    });

    it('should return based on Date.now()', () => {
      const date = new Date('2019-1-1');
      const clock = lolex.install({ now: date });
      const d = undefined;

      const real = getRealTime(d);
      expect(typeof real).toBe('number');
      expect(real).toEqual(1546272000000);
      clock.uninstall();
    });
  });

  describe('#getSlotNumber', () => {
    const getSlotNumber = slots.getSlotNumber;

    it('should be a function', () => {
      expect(typeof getSlotNumber).toBe('function');
    });

    it('should return slot number, equal to 19614', () => {
      const d = 196144;
      const slot = getSlotNumber(d);
      expect(typeof slot).toBe('number');
      expect(slot).toEqual(19614);
    });

    it('should return slot number based on Date.now, equal to 370080', () => {
      const date = new Date('2019-1-1');
      const clock = lolex.install({ now: date });

      const d = undefined;
      const slot = getSlotNumber(d);
      expect(typeof slot).toBe('number');
      expect(slot).toEqual(370080);

      clock.uninstall();
    });
  });

  describe('#getSlotTime', () => {
    const getSlotTime = slots.getSlotTime;

    it('should be function', () => {
      expect(typeof getSlotTime).toBe('function');
    });

    it('should return slot time number, equal to ', () => {
      const slot = 19614;
      const slotTime = getSlotTime(slot);
      expect(slotTime).toEqual(196140);
    });
  });

  describe('#getNextSlot', () => {
    const getNextSlot = slots.getNextSlot;

    it('should be function', () => {
      expect(typeof getNextSlot).toBe('function');
    });

    it('should return next slot number', () => {
      const date = new Date('2019-1-1');
      const clock = lolex.install({ now: date });

      const nextSlot = getNextSlot();
      // nextSlot.should.be.type('number').and.not.NaN;
      expect(typeof nextSlot).toBe('number');
      expect(nextSlot).toBe(370081);

      clock.uninstall();
    });
  });

  describe('#getLastSlot', () => {
    const getLastSlot = slots.getLastSlot;

    it('should be function', () => {
      expect(typeof getLastSlot).toBe('function');
    });

    it('should return last slot number', () => {
      const date = new Date('2019-1-1');
      const clock = lolex.install({ now: date });

      const lastSlot = getLastSlot(slots.getNextSlot());
      // lastSlot.should.be.type('number').and.not.NaN;
      expect(typeof lastSlot).toBe('number');
      expect(lastSlot).toBe(370182);

      clock.uninstall();
    });
  });
});
