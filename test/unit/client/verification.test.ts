import * as gnyClient from '@gnyio/client';

describe('verification', () => {
  it('sign message', () => {
    const bip39 =
      'observe among elder swarm renew vanish work orchard drive cousin bright clay';

    const keys = gnyClient.crypto.getKeys(bip39);
    console.log(`private key: ${keys.privateKey.toUpperCase()}`);
    console.log(`public key: ${keys.publicKey.toUpperCase()}`);

    const hexMessage = Buffer.from('68656c6c6f68656c6c6f', 'hex'); // hellohello
    const result = gnyClient.verification.MessageWebBase.sign(
      hexMessage,
      keys.keypair
    );
    expect(result).toEqual(
      'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c'
    );
  });

  it('verify message', () => {
    const bip39 =
      'observe among elder swarm renew vanish work orchard drive cousin bright clay';

    const keys = gnyClient.crypto.getKeys(bip39);

    const msg = 'hellohello';

    const signature =
      'b01b781b89b7f6b7de1fba0cc992bf528f8422e3960e087f396cc83014028ad891bd848c2405b47419fdba643ce2206e1bad18a540b1a64e84d04c0c6aa1a40f';

    const result = gnyClient.verification.MessageWebBase.verify(
      msg,
      // @ts-ignore
      Buffer.from(signature, 'hex'),
      // @ts-ignore
      Buffer.from(keys.publicKey, 'hex')
    );
    expect(result).toEqual(true);
  });
});
