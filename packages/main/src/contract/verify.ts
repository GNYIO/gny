import { Context } from '@gnyio/interfaces';

import { Verification } from '@gnyio/database-postgres';

export default {
  async verify(this: Context, key, signature) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (
      this.sender.publicKey &&
      this.sender.publicKey !== this.trs.senderPublicKey
    ) {
      return 'collission attack attempt';
    }

    const keyRegex = /^[a-z]+$/;

    if (!keyRegex.test(key)) {
      return 'argument key not valid';
    }
    if (typeof key !== 'string' || key.length > 64) {
      return 'argument key not valid';
    }

    const signatureRegex = /^$/;
    console.log(signatureRegex);
  },
};
