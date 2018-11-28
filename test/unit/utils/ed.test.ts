import * as ed from '../../../src/utils/ed';
import * as crypto from 'crypto';

describe('ed', () => {
  describe('generateKeyPair', () => {
		let keys;
    beforeEach(done => {
      const randomString = 'ABCDEFG';
      const hash = crypto.createHash('sha256').update(randomString, 'utf8').digest();
			keys = ed.generateKeyPair(hash);
      done();
		});

		it('should create keypair from a random string', done => {
			expect(keys).toHaveProperty('privateKey');
			expect(keys).toHaveProperty('publicKey');
			done();
		});

		it('should create a publicKey as a Buffer type', done => {
			expect(Buffer.isBuffer(keys.publicKey)).toBe(true);
			done();
		});

		it('should create a privateKey should have be a Buffer type', done => {
			expect(Buffer.isBuffer(keys.privateKey)).toBe(true);
			done();
		});
	});

	describe('sign', () => {
		let keys;
		let messageToSign = {
			field: 'value',
		};

		beforeEach(done => {
			let randomstring = 'ABCDE';
			let hash = crypto
				.createHash('sha256')
				.update(randomstring, 'utf8')
				.digest();
			keys = ed.generateKeyPair(hash);
			done();
		});

		it('should create signature as Buffer from data as Buffer and privateKey', done => {
			const signature = ed.sign(Buffer.from(JSON.stringify(messageToSign)), keys.privateKey);
			expect(Buffer.isBuffer(signature)).toBe(true);
			done();
		});

		it('should create signature as Buffer from data as Buffer and a privateKey after Buffer.from function applied on it', done => {
			const signature = ed.sign(
				Buffer.from(JSON.stringify(messageToSign)),
				Buffer.from(keys.privateKey, 'hex')
			);
			expect(Buffer.isBuffer(signature)).toBe(true);
			done();
		});

		it('should throw error when passing string as message to sign', done => {
			expect(ed.sign.bind(null, JSON.stringify(messageToSign), keys.privateKey)).toThrowError('argument "message" must be a buffer')
			done();
		});

		it('should throw error when passing JSON as message to sign', done => {
			expect(ed.sign.bind(null, messageToSign, keys.privateKey)).toThrowError('argument "message" must be a buffer');
			done();
		});
	});

	describe('verify', () => {
		let keys;
		let signature;
		let messageToSign = {
			field: 'value',
		};

		beforeEach(done => {
			let randomstring = 'ABCDE';
			let hash = crypto.createHash('sha256').update(randomstring, 'utf8').digest();
			keys = ed.generateKeyPair(hash);
			signature = ed.sign(Buffer.from(JSON.stringify(messageToSign)), keys.privateKey);
			done();
		});

		it('should return true when valid Buffer signature is checked with matching Buffer public key and valid Buffer message', done => {
			const verified = ed.verify(Buffer.from(JSON.stringify(messageToSign)), signature, keys.publicKey);
			expect(verified).toBeTruthy;
			done();
		});

		it('should return false when malformed signature is checked with Buffer public key', done => {
			let wrongSignature = ed.sign(Buffer.from(JSON.stringify('wrong message')), keys.privateKey);
			let verified = ed.verify(Buffer.from(JSON.stringify(messageToSign)), wrongSignature, keys.publicKey);
			expect(verified).toBeFalsy;
			done();
		});

		it('should return false proper signature and proper publicKey is check against malformed data', done => {
			let verified = ed.verify(Buffer.from('malformed data'), signature, keys.publicKey);
			expect(verified).toBeFalsy;
			done();
		});

		it('should throw an error when proper non hex string signature is checked with matching string hex public key', done => {
			expect(
				ed.verify.bind(
					null,
					Buffer.from(JSON.stringify(messageToSign)),
					signature.toString(),
					keys.publicKey.toString('hex')
				)
			).toThrowError();
			done();
		});

		it('should throw an error when proper non hex string signature is checked with matching string non hex public key', done => {
			expect(
				ed.verify.bind(
					null,
					Buffer.from(JSON.stringify(messageToSign)),
					signature.toString('hex'),
					keys.publicKey.toString()
				)
			).toThrowError();
			done();
		});
	});
});