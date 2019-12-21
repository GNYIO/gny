import 'jest-extended';
import { joi } from '@gny/extendedJoi';

const TIMEOUT = 60000;

describe('crypto', () => {
  beforeEach(async () => {
    await page.goto(PATH, { waitUntil: 'load' });
  }, 30 * 1000);

  describe('/getBytes', () => {
    it(
      'should return Buffer of simply transaction and buffer most be 155 length',
      async () => {
        const bytes = await page.evaluate(() => {
          const transaction = {
            type: 1,
            timestamp: 68365026,
            fee: 10000000,
            args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
            senderPublicKey:
              '116025d5664ce153b02c69349798ab66144edd2a395e822b13587780ac9c9c09',
            senderId: 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv',
            signatures: [
              '6b9a02208c0c36a0adf527d117cc3840f4b6c0a6eeac8cd212635f120592a101b68aeae0efe43ee28b0fd2add6fdb14f6b51b5ebff467b02909f4cdd66276603',
            ],
            id:
              '43a9ed49665d7e905b717e54f39b1d9976e3332608bacf6083a3e130a0d12eed',
          };
          return gnyClient.crypto.getBytes(transaction);
        });
        expect(Object.keys(bytes).length).toEqual(155);
      },
      TIMEOUT
    );

    it(
      'should return Buffer of transaction with second signature and buffer most be 219 length',
      async () => {
        const bytes = await page.evaluate(() => {
          const transaction = {
            type: 1,
            timestamp: 68365928,
            fee: 10000000,
            args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
            senderPublicKey:
              '116025d5664ce153b02c69349798ab66144edd2a395e822b13587780ac9c9c09',
            senderId: 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv',
            signatures: [
              'e1da25b8278d9cf4dcb32d8be73681ce701f0f01518b3d68e80c235a0f9d7d3fcfae7d454976f82535bc181fccd0f7cefc2fe3f1f158e76789a775bdce1d2906',
            ],
            secondSignature:
              '067ec26a4bc1cb84926b49bb85e5701bebb2a8d4d4aef2c7fe075e2b6ca7e8a4c3ca77e709262d58760f4f3f3d00bdfc3f32c2be6c92856b29366e4d4ef77703',
            id:
              '7608330225429661920fbdad67abc7c8b220c212a112bd76a1e33134cc082473',
          };
          return gnyClient.crypto.getBytes(transaction);
        });
        expect(Object.keys(bytes).length).toEqual(219);
      },
      TIMEOUT
    );
  });

  describe('/getHash', () => {
    it(
      'should return Buffer and Buffer must be 32 bytes length',
      async () => {
        const result = await page.evaluate(() => {
          const transaction = {
            type: 1,
            timestamp: 68365026,
            fee: 10000000,
            args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
            senderPublicKey:
              '116025d5664ce153b02c69349798ab66144edd2a395e822b13587780ac9c9c09',
            senderId: 'ABuH9VHV3cFi9UKzcHXGMPGnSC4QqT2cZ5',
            signatures: [
              '6b9a02208c0c36a0adf527d117cc3840f4b6c0a6eeac8cd212635f120592a101b68aeae0efe43ee28b0fd2add6fdb14f6b51b5ebff467b02909f4cdd66276603',
            ],
          };
          return gnyClient.crypto.getHash(transaction);
        });
        expect(Object.keys(result).length).toEqual(32);
      },
      TIMEOUT
    );
  });

  describe('/getId', () => {
    it(
      'should return string id and be equal to 43a9ed49665d7e905b717...',
      async () => {
        const id = await page.evaluate(() => {
          const transaction = {
            type: 1,
            timestamp: 68365026,
            fee: 10000000,
            args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
            senderPublicKey:
              '116025d5664ce153b02c69349798ab66144edd2a395e822b13587780ac9c9c09',
            senderId: 'ABuH9VHV3cFi9UKzcHXGMPGnSC4QqT2cZ5',
            signatures: [
              '6b9a02208c0c36a0adf527d117cc3840f4b6c0a6eeac8cd212635f120592a101b68aeae0efe43ee28b0fd2add6fdb14f6b51b5ebff467b02909f4cdd66276603',
            ],
          };
          return gnyClient.crypto.getId(transaction);
        });
        expect(id).toBeString();
        expect(id).toEqual(
          '07152e2898a19b1547de48f81d92ed696b33ff9fe00f7abd1bfbe40b39e521aa'
        );
      },
      TIMEOUT
    );
  });

  describe('/getKeys', () => {
    it(
      'should return two keys in hex',
      async () => {
        const keys = await page.evaluate(() => {
          return gnyClient.crypto.getKeys('secret');
        });

        expect(keys).toBeObject();
        expect(keys).toHaveProperty('publicKey');
        expect(keys).toHaveProperty('privateKey');

        const publicSchema = joi
          .string()
          .hex(32)
          .required();

        const publicReport = joi.validate(keys.publicKey, publicSchema);
        expect(publicReport.error).toBeNull();

        const privateSchema = joi
          .string()
          .hex(64)
          .required();
        const privateReport = joi.validate(keys.privateKey, privateSchema);
        expect(privateReport.error).toBeNull();
      },
      TIMEOUT
    );
  });

  describe('/getAddress', () => {
    it(
      'should generate address by publicKey',
      async () => {
        const address = await page.evaluate(() => {
          const keys = gnyClient.crypto.getKeys('secret');
          return gnyClient.crypto.getAddress(keys.publicKey);
        });

        expect(address).toBeString();
        expect(address).toEqual('G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv');
      },
      TIMEOUT
    );
  });
});
