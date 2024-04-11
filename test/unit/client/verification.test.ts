import * as gnyClient from '@gnyio/client';

describe('verification', () => {
  it('should be object', () => {
    const bip39 =
      'observe among elder swarm renew vanish work orchard drive cousin bright clay';

    const keys = gnyClient.crypto.getKeys(bip39);

    const msg = 'hellohello';
    const result = gnyClient.verification.MessageWebBase.sign(
      msg,
      keys.keypair
    );
    console.log(result);
  });
});
