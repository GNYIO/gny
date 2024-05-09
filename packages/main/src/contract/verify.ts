import { Context, IVerification } from '@gnyio/interfaces';

import { Verification } from '@gnyio/database-postgres';
import { Account } from '@gnyio/database-postgres';

import { isSignature, isIdentifier } from '@gnyio/utils';

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

    if (!isIdentifier(identifier)) {
      return 'argument identifier not valid';
    }

    if (!isSignature(signature)) {
      return 'argument signature not valid';
    }

    // can't create two verifications with same identifier in one block
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
      timestamp: this.trs.timestamp,
      height: this.block.height,
    };
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
