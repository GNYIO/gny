import * as gnyClient from '@gnyio/client';

describe('verification', () => {
  it('sign message', () => {
    const bip39 =
      'observe among elder swarm renew vanish work orchard drive cousin bright clay';

    const keys = gnyClient.crypto.getKeys(bip39);

    const msg = 'hellohello';
    const result = gnyClient.verification.MessageWebBase.sign(
      msg,
      keys.keypair
    );
    expect(result).toEqual(
      'b01b781b89b7f6b7de1fba0cc992bf528f8422e3960e087f396cc83014028ad891bd848c2405b47419fdba643ce2206e1bad18a540b1a64e84d04c0c6aa1a40f'
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
