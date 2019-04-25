import { Transaction } from '../../../src/base/transaction';
import basic from '../../../src/contract/basic';
import { IScope } from '../../../src/interfaces';
import extendedJoi from '../../../src/utils/extendedJoi';
import { ILogger } from '../../../src/interfaces';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as crypto from 'crypto';
import * as ed from '../../../src/utils/ed';

// import { Transaction as ITransaction } from '../../../src/interfaces';

jest.mock('../../../packages/database-postgres/src/smartDB');
jest.mock('../../../src/contract/basic');

export function createTransation() {
  const data = {
    type: 10,
    fee: 10000000000,
    timestamp: 12165155,
    senderId: 'G2WocDNFv5ZPwxAia3sjREq7qWM2C',
    senderPublicKey:
      '2e65eb2d727adb6b39557c27093562aa93a9f8bad33a2d261acf4fce380c59b9',
    message: '',
    args: [40000000000000000, 'G4GDW6G78sgQdSdVAQUXdm5xPS13t'],
    signatures: [
      '1a7d4b477840ad70e81edf932a52784575d811a61ad337f901627380e13407069ad487f35958dca5a7e0954aa18742823a96ad157e72f4316090c7b5161fb80d',
    ],
    secondSignature:
      '9197c401ae2c72532e0d16340ec920639798714962e03c50d6742ed91944b5a8246e0f83d761435f2619a3413e3dd0f5fa8070c00d2f44ff99d5ac9600fe4b02',
    id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
  };
  return data;
}

describe('Transaction', () => {
  let transaction;

  const iScope = {
    joi: extendedJoi,
  } as IScope;

  beforeEach(done => {
    transaction = new Transaction(iScope);
    const logger: ILogger = {
      log: x => x,
      trace: x => x,
      debug: x => x,
      info: x => x,
      warn: x => x,
      error: x => x,
      fatal: x => x,
    };
    const sdb = new SmartDB(logger);
    global.app = {
      getContractName: jest.fn(type => 'basic.transfer'),
      contract: { basic: basic },
      sdb: sdb,
      validate: jest.fn((type, value) => null),
    };
    done();
  });

  describe('create', () => {
    let trs;
    beforeEach(done => {
      const secret = 'ABCDEFG';
      const secondSecret = 'HIJKLMN';
      const hash = crypto
        .createHash('sha256')
        .update(secret, 'utf8')
        .digest();
      const keypair = ed.generateKeyPair(hash);
      const secondKeypair = ed.generateKeyPair(
        crypto
          .createHash('sha256')
          .update(secondSecret, 'utf8')
          .digest()
      );
      const data = {
        type: 10,
        fee: 10000000000,
        timestamp: 0,
        senderId: 'G2EjKCgA4SBpApcHKzTXFEG4aN2fX',
        message: '',
        args: [40000000000000000, 'G4GDW6G78sgQdSdVAQUXdm5xPS13t'],
        keypair: keypair,
        secondKeypair: secondKeypair,
      };
      trs = transaction.create(data);
      done();
    });

    it('should return a transaction', done => {
      expect(trs).toHaveProperty('signatures');
      expect(trs).toHaveProperty('id');
      expect(trs).toHaveProperty('secondSignature');
      done();
    });
  });

  describe('getId', () => {
    let id;
    let trs;
    beforeEach(done => {
      trs = createTransation();
      id = transaction.getId(trs);
      done();
    });

    it('shoudl return a transaction id', () => {
      expect(id).toHaveLength(64);
      expect(id).toEqual(trs.id);
    });
  });

  describe('getBytes', () => {
    let bytes;

    beforeEach(done => {
      const trs = createTransation();
      bytes = transaction.getBytes(trs, false, false);
      done();
    });

    it('should create a Buffer from a transaction', () => {
      expect(Buffer.isBuffer(bytes)).toBe(true);
    });
  });

  describe('verifyNormalSignature', () => {
    let trs;
    let sender;
    let bytes;

    beforeEach(done => {
      trs = createTransation();
      sender = {};
      bytes = transaction.getBytes(trs, true, true);
      done();
    });

    it('should return undifined when valid normal signature is checked', () => {
      const verified = transaction.verifyNormalSignature(trs, sender, bytes);
      expect(verified).toBeUndefined();
    });
  });

  describe('verify', () => {
    let context;
    let trs;
    let sender;

    beforeEach(done => {
      trs = createTransation();
      sender = {};
      context = { trs, sender };
      done();
    });

    it('should return undifined when valid normal signature is checked', async () => {
      const verified = await transaction.verify(context);
      expect(verified).toBeUndefined();
    });
  });

  describe('verifyBytes', () => {
    let bytes;
    let publicKey;
    let signature;

    beforeEach(done => {
      const trs = createTransation();
      bytes = transaction.getBytes(trs, true, true);
      publicKey = trs.senderPublicKey;
      signature = trs.signatures[0];
      done();
    });

    it('should return true when valid bytes are checked', () => {
      const verified = transaction.verifyBytes(bytes, publicKey, signature);
      expect(verified).toBeTruthy();
    });
  });

  describe('apply', () => {
    let context;
    let trs;
    let sender;
    let block;

    beforeEach(done => {
      trs = createTransation();
      sender = {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        gny: 400000000000000000,
      };
      block = { height: 1 };
      context = { trs, sender, block };
      done();
    });

    it('should return nothing if applied', async () => {
      global.app.sdb.update.mockReturnValue(true);
      global.app.contract.basic.transfer.mockReturnValue(null);

      const applied = await transaction.apply(context);
      expect(applied).toBeNull();
    });
  });

  describe('objectNormalize', () => {
    let trs;

    beforeEach(done => {
      trs = createTransation();
      done();
    });

    it('should return the normalized trsanction', () => {
      const normalizedTrs = transaction.objectNormalize(trs);
      expect(normalizedTrs).toEqual(trs);
    });
  });
});
