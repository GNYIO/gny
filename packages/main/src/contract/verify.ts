import { Context, IVerification } from '@gnyio/interfaces';

import { Verification } from '@gnyio/database-postgres';
import { Account } from '@gnyio/database-postgres';

export default {
  async verify(this: Context, identifier, signature) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (
      this.sender.publicKey &&
      this.sender.publicKey !== this.trs.senderPublicKey
    ) {
      return 'collission attack attempt';
    }

    const sender = this.sender;

    const identifierRegex = /^[A-Z_]+$/;
    if (!identifierRegex.test(identifier)) {
      return 'argument key not valid';
    }
    if (typeof identifier !== 'string' || identifier.length > 64) {
      return 'argument key not valid';
    }

    const signatureRegex = /^[a-z09]+$/;
    if (!signatureRegex.test(signature)) {
      return 'argument signature not valid';
    }
    if (typeof signature !== 'string' || signature.length > 128) {
      return 'argument signature not valid';
    }

    await global.app.sdb.lock(`verify.verify@${identifier}`);
    const exists = await global.app.sdb.exists<Verification>(Verification, {
      identifier,
    });
    if (exists) return 'Verification already exists';

    const verification: IVerification = {
      identifier,
      tid: this.trs.id,
      senderId: sender.address,
      signature,
      timestamp: this.block.timestamp, // better than this.trs.timestamp
    };
    console.log(verification);
    await global.app.sdb.create<Verification>(Verification, verification);

    // set publicKey on account if not set
    // if public key not set, set it
    if (!this.sender.publicKey) {
      await global.app.sdb.update<Account>(
        Account,
        { publicKey: this.trs.senderPublicKey },
        { address: this.sender.address }
      );
    }

    return null;
  },
};
