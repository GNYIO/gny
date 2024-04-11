import { KeyPair } from '@gnyio/interfaces';
import * as webEd from '@gnyio/web-ed';
import * as helpers from './helpers';

// to sign and verify custom verifications
export class MessageWebBase {
  public static sign(message: string, keypair: KeyPair) {
    const hash = helpers.sha256Bytes(message);
    // return hash;

    return webEd.sign(hash, keypair.privateKey).toString('hex');
  }

  public static verify() {}
}
