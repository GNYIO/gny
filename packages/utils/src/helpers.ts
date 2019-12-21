import * as Mnemonic from 'bitcore-mnemonic';

export function generateSecret(): string {
  return new Mnemonic(Mnemonic.Words.ENGLISH).toString();
}
