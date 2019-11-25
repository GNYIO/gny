import { TransactionBase, CreateTransactionType } from '@gny/base';
import { ITransaction, Context, IAccount } from '@gny/packages';
import * as crypto from 'crypto';
import * as ed from '@gny/ed';

function randomHex(length: number) {
  return crypto.randomBytes(length).toString('hex');
}

function createTransation() {
  const data: ITransaction = {
    type: 10,
    fee: String(10000000000),
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
    height: String(0),
  };
  return data;
}

describe('Transaction', () => {
  describe('create', () => {
    let trs: ITransaction;
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
      const data: CreateTransactionType = {
        type: 10,
        fee: String(10000000000),
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
    let trs: ITransaction;
    beforeEach(done => {
      trs = createTransation();
      id = TransactionBase.getId(trs);
      done();
    });

    it('should return a transaction id', () => {
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
    it('verifyNormalSignature() - should return undefined when simple signature check was successful', () => {
      const trs = createTransation();
      delete trs.secondSignature;

      const sender = {} as IAccount;
      const bytes = TransactionBase.getBytes(trs, true, true);

      const verified = TransactionBase.verifyNormalSignature(
        trs,
        sender,
        bytes
      );
      expect(verified).toBeUndefined();
    });

    it('verifyNormalSignature() - returns error string when simple signature check failed', done => {
      const trs = createTransation();
      const sender = {} as IAccount;
      let bytes = TransactionBase.getBytes(trs, true, true);

      // preparation: tamper the bytes
      bytes = Buffer.from('tampered buffer');

      const result = TransactionBase.verifyNormalSignature(trs, sender, bytes);

      expect(result).toEqual('Invalid signature');
      done();
    });

    it('verifyNormalSignature() - should return undefined when second signature check was successful', done => {
      const secret = 'some long secret';
      const secondSecret = 'second secret';
      const hash = crypto
        .createHash('sha256')
        .update(secret, 'utf8')
        .digest();
      const keypair = ed.generateKeyPair(hash);

      const hash2 = crypto
        .createHash('sha256')
        .update(secondSecret, 'utf8')
        .digest();

      const secondKeyPair = ed.generateKeyPair(hash2);

      const trs = TransactionBase.create({
        fee: String(0.1 * 1e8),
        args: [],
        keypair: keypair,
        secondKeypair: secondKeyPair,
        type: 10,
      });

      const sender = {
        secondPublicKey: secondKeyPair.publicKey.toString('hex'),
      } as IAccount;

      const bytes = TransactionBase.getBytes(trs, true, true);

      const result = TransactionBase.verifyNormalSignature(trs, sender, bytes);

      expect(result).toBeUndefined();
      done();
    });

    it('verifyNormalSignature() - should return error string when second signature check failed', done => {
      const secret = 'some long secret';
      const secondSecret = 'second secret';
      const hash = crypto
        .createHash('sha256')
        .update(secret, 'utf8')
        .digest();
      const keypair = ed.generateKeyPair(hash);

      const hash2 = crypto
        .createHash('sha256')
        .update(secondSecret, 'utf8')
        .digest();

      const secondKeyPair = ed.generateKeyPair(hash2);

      const trs = TransactionBase.create({
        fee: String(0.1 * 1e8),
        args: [],
        keypair: keypair,
        secondKeypair: secondKeyPair,
        type: 10,
      });

      const sender = {
        secondPublicKey: secondKeyPair.publicKey.toString('hex'),
      } as IAccount;

      // manipulate
      trs.secondSignature = Buffer.from('wrong secondSignature').toString(
        'hex'
      );

      const bytes = TransactionBase.getBytes(trs, true, true);

      const result = TransactionBase.verifyNormalSignature(trs, sender, bytes);

      expect(result).toEqual('Invalid second signature');
      done();
    });

    it('verifyNormalSignature() - if sender has secondPublicKey but transaction has not secondSignature returns error string', done => {
      const secret = 'some long secret';
      const secondSecret = 'second secret';
      const hash = crypto
        .createHash('sha256')
        .update(secret, 'utf8')
        .digest();
      const keypair = ed.generateKeyPair(hash);

      const trs = TransactionBase.create({
        keypair: keypair,
        args: [],
        type: 10,
        fee: String(0.1 * 1e8),
      });

      const bytes = TransactionBase.getBytes(trs, true, true);
      // wrong sender
      const sender = {
        secondPublicKey: randomHex(32),
      } as IAccount;

      const result = TransactionBase.verifyNormalSignature(trs, sender, bytes);

      expect(result).toEqual('Second signature not provided');
      done();
    });
  });

  describe('verify', () => {
    let context: Pick<Context, 'trs' | 'sender'>;
    let trs: ITransaction;
    let sender;

    beforeEach(done => {
      trs = createTransation();
      sender = {};
      context = { trs, sender };
      done();
    });

    it('should return undefined when valid normal signature is checked', async () => {
      delete trs.secondSignature;

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

  describe('objectNormalize', () => {
    let trs: ITransaction;

    beforeEach(done => {
      trs = createTransation();
      done();
    });

    it('should return the normalized transaction', () => {
      const normalizedTrs = TransactionBase.normalizeTransaction(trs);
      expect(normalizedTrs).toEqual(trs);
    });
  });
});
