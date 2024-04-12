import { KeyPair } from '@gnyio/interfaces';
import * as webEd from '@gnyio/web-ed';
import * as helpers from './helpers';

// to sign and verify custom verifications
export class MessageWebBase {
  // signs with private key
  public static sign(message: string, keypair: KeyPair) {
    return webEd.sign(message, keypair.privateKey).toString('hex');
  }

  public static verify(message: string, signature: string, publicKey: string) {
    const c: boolean = webEd.verify(message, signature, publicKey);
    return result;
  }
}
