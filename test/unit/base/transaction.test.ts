import { TransactionBase } from '../../../src/base/transaction';
import basic from '../../../src/contract/basic';
import { Transaction, Context, IBlock } from '../../../src/interfaces';
import extendedJoi from '../../../src/utils/extendedJoi';
import { ILogger } from '../../../src/interfaces';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as crypto from 'crypto';
import * as ed from '../../../src/utils/ed';

jest.mock('../../../packages/database-postgres/src/smartDB');
jest.mock('../../../src/contract/basic');

function createTransation() {
  const data: Transaction = {
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
    height: 0,
  };
  return data;
}

describe('Transaction', () => {
  beforeEach(done => {
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
    let trs: Transaction;
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
      trs = TransactionBase.create(data);
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
    let id: string;
    let trs: Transaction;
    beforeEach(done => {
      trs = createTransation();
      id = TransactionBase.getId(trs);
      done();
    });

    it('shoudl return a transaction id', () => {
      expect(id).toHaveLength(64);
      expect(id).toEqual(trs.id);
    });
  });

  describe('getBytes', () => {
    let bytes: Buffer;

    beforeEach(done => {
      const trs = createTransation();
      bytes = TransactionBase.getBytes(trs, false, false);
      done();
    });

    it('should create a Buffer from a transaction', () => {
      expect(Buffer.isBuffer(bytes)).toBe(true);
    });
  });

  describe('verifyNormalSignature', () => {
    let trs: Transaction;
    let sender;
    let bytes: Buffer;

    beforeEach(done => {
      trs = createTransation();
      sender = {};
      bytes = TransactionBase.getBytes(trs, true, true);
      done();
    });

    it('should return undefined when valid normal signature is checked', () => {
      const verified = TransactionBase.verifyNormalSignature(
        trs,
        sender,
        bytes
      );
      expect(verified).toBeUndefined();
    });
  });

  describe('verify', () => {
    let context: Context;
    let trs: Transaction;
    let sender;

    beforeEach(done => {
      trs = createTransation();
      sender = {};
      context = { trs, sender };
      done();
    });

    it('should return undefined when valid normal signature is checked', async () => {
      const verified = await TransactionBase.verify(context);
      expect(verified).toBeUndefined();
    });
  });

  describe('verifyBytes', () => {
    let bytes: Buffer;
    let publicKey: string;
    let signature: string;

    beforeEach(done => {
      const trs = createTransation();
      bytes = TransactionBase.getBytes(trs, true, true);
      publicKey = trs.senderPublicKey;
      signature = trs.signatures[0];
      done();
    });

    it('should return true when valid bytes are checked', () => {
      const verified = TransactionBase.verifyBytes(bytes, publicKey, signature);
      expect(verified).toBeTruthy();
    });
  });

  describe('apply', () => {
    let context: Context;
    let trs: Transaction;
    let sender;
    let block: Pick<IBlock, 'height'>;

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

    it.skip('should return nothing if applied', async () => {
      global.app.sdb.update.mockReturnValue(true);
      global.app.contract.basic.transfer.mockReturnValue(null);

      const applied = await TransactionBase.apply(context);
      expect(applied).toBeNull();
    });
  });

  describe('objectNormalize', () => {
    let trs: Transaction;

    beforeEach(done => {
      trs = createTransation();
      done();
    });

    it('should return the normalized trsanction', () => {
      const normalizedTrs = TransactionBase.normalizeTransaction(trs);
      expect(normalizedTrs).toEqual(trs);
    });
  });
});
